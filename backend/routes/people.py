# Authored by James Williams
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from db.connection import get_connection
from db.queries.people_queries import (
    get_case_people, create_person,
    add_suspect, add_victim,
    remove_suspect, remove_victim,
    update_suspect,
)
from db.mongo_connection import get_mongo_db
from db.queries.mongo_queries import add_timeline_event, log_audit_event
from middleware.auth_middleware import get_current_user

router = APIRouter()

SUSPECT_STATUSES  = {"Active", "Cleared", "Arrested"}
RISK_LEVELS       = {"Low", "Medium", "High"}
ROLES             = {"suspect", "victim"}


class AddPersonBody(BaseModel):
    role:          str
    first_name:    str
    last_name:     str
    dob:           Optional[str] = None
    contact_phone: Optional[str] = None
    # Suspect-only
    status:        Optional[str] = "Active"
    risk_level:    Optional[str] = "Low"


class UpdateSuspectBody(BaseModel):
    status:     Optional[str] = None
    risk_level: Optional[str] = None


def _case_number(conn, case_id: int) -> str:
    with conn.cursor() as cur:
        cur.execute("SELECT case_number FROM cases WHERE case_id = %s", (case_id,))
        row = cur.fetchone()
    return row[0] if row else str(case_id)


# ── GET /cases/{case_id}/people ───────────────────────────────────────────────

@router.get("/cases/{case_id}/people")
def get_people(case_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        return get_case_people(conn, case_id)
    finally:
        conn.close()


# ── POST /cases/{case_id}/people ──────────────────────────────────────────────

@router.post("/cases/{case_id}/people")
def add_person(case_id: int, body: AddPersonBody,
               current_user=Depends(get_current_user)):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="role must be 'suspect' or 'victim'")
    if not body.first_name.strip() or not body.last_name.strip():
        raise HTTPException(status_code=400, detail="First and last name are required")
    if body.role == "suspect":
        if body.status and body.status not in SUSPECT_STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of {SUSPECT_STATUSES}")
        if body.risk_level and body.risk_level not in RISK_LEVELS:
            raise HTTPException(status_code=400, detail=f"risk_level must be one of {RISK_LEVELS}")

    conn = get_connection()
    try:
        case_num = _case_number(conn, case_id)
        person_id = create_person(
            conn,
            body.first_name.strip(),
            body.last_name.strip(),
            body.dob,
            body.contact_phone,
        )
        if body.role == "suspect":
            add_suspect(conn, case_id, person_id,
                        body.status or "Active", body.risk_level or "Low")
        else:
            add_victim(conn, case_id, person_id)
    finally:
        conn.close()

    person_name = f"{body.first_name.strip()} {body.last_name.strip()}"
    actor = current_user.get("name", f"User {current_user['user_id']}")
    action_type = "SUSPECT_ADDED" if body.role == "suspect" else "VICTIM_ADDED"
    detail = (
        f"{actor} added suspect {person_name} (status: {body.status or 'Active'}, "
        f"risk: {body.risk_level or 'Low'}) to case {case_num}"
        if body.role == "suspect"
        else f"{actor} added victim {person_name} to case {case_num}"
    )

    db = get_mongo_db()
    add_timeline_event(
        db, case_id, action_type, current_user["user_id"],
        detail, created_by_name=actor,
    )
    log_audit_event(
        db, current_user["user_id"], action_type,
        detail, case_id=case_id, user_name=actor,
    )

    return {"person_id": person_id}


# ── PATCH /cases/{case_id}/suspects/{person_id} ───────────────────────────────

@router.patch("/cases/{case_id}/suspects/{person_id}")
def patch_suspect(case_id: int, person_id: int, body: UpdateSuspectBody,
                  current_user=Depends(get_current_user)):
    if body.status and body.status not in SUSPECT_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {SUSPECT_STATUSES}")
    if body.risk_level and body.risk_level not in RISK_LEVELS:
        raise HTTPException(status_code=400, detail=f"risk_level must be one of {RISK_LEVELS}")

    conn = get_connection()
    try:
        case_num = _case_number(conn, case_id)
        update_suspect(conn, case_id, person_id, body.status, body.risk_level)
    finally:
        conn.close()

    changes = []
    if body.status:
        changes.append(f"status → {body.status}")
    if body.risk_level:
        changes.append(f"risk → {body.risk_level}")
    change_str = ", ".join(changes) if changes else "no changes"

    actor = current_user.get("name", f"User {current_user['user_id']}")
    detail = f"{actor} updated suspect #{person_id} on case {case_num}: {change_str}"

    db = get_mongo_db()
    log_audit_event(
        db, current_user["user_id"], "SUSPECT_UPDATED",
        detail, case_id=case_id, user_name=actor,
    )

    return {"ok": True}


# ── DELETE /cases/{case_id}/suspects/{person_id} ─────────────────────────────

@router.delete("/cases/{case_id}/suspects/{person_id}")
def delete_suspect(case_id: int, person_id: int,
                   current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        case_num = _case_number(conn, case_id)
        remove_suspect(conn, case_id, person_id)
    finally:
        conn.close()

    actor = current_user.get("name", f"User {current_user['user_id']}")
    detail = f"{actor} removed suspect #{person_id} from case {case_num}"

    db = get_mongo_db()
    add_timeline_event(
        db, case_id, "SUSPECT_REMOVED", current_user["user_id"],
        detail, created_by_name=actor,
    )
    log_audit_event(
        db, current_user["user_id"], "SUSPECT_REMOVED",
        detail, case_id=case_id, user_name=actor,
    )

    return {"ok": True}


# ── DELETE /cases/{case_id}/victims/{person_id} ───────────────────────────────

@router.delete("/cases/{case_id}/victims/{person_id}")
def delete_victim(case_id: int, person_id: int,
                  current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        case_num = _case_number(conn, case_id)
        remove_victim(conn, case_id, person_id)
    finally:
        conn.close()

    actor = current_user.get("name", f"User {current_user['user_id']}")
    detail = f"{actor} removed victim #{person_id} from case {case_num}"

    db = get_mongo_db()
    add_timeline_event(
        db, case_id, "VICTIM_REMOVED", current_user["user_id"],
        detail, created_by_name=actor,
    )
    log_audit_event(
        db, current_user["user_id"], "VICTIM_REMOVED",
        detail, case_id=case_id, user_name=actor,
    )

    return {"ok": True}
