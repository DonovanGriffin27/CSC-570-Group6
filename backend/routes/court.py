# Authored by James Williams
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from db.connection import get_connection
from db.queries.court_queries import get_court_dates, create_court_date, delete_court_date
from db.mongo_connection import get_mongo_db
from db.queries.mongo_queries import add_timeline_event, log_audit_event
from middleware.auth_middleware import get_current_user

router = APIRouter()

HEARING_TYPES = {
    "Arraignment", "Bail Hearing", "Preliminary Hearing",
    "Pre-Trial Conference", "Motion Hearing", "Trial",
    "Sentencing", "Appeal", "Other",
}


class CourtDateCreate(BaseModel):
    date: str
    court: str
    hearing_type: Optional[str] = None


@router.get("/cases/{case_id}/court-dates")
def get_case_court_dates(case_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        return get_court_dates(conn, case_id)
    finally:
        conn.close()


@router.post("/cases/{case_id}/court-dates")
def add_court_date(case_id: int, body: CourtDateCreate,
                   current_user=Depends(get_current_user)):
    if not body.court.strip():
        raise HTTPException(status_code=400, detail="Court name is required")
    if body.hearing_type and body.hearing_type not in HEARING_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"hearing_type must be one of {sorted(HEARING_TYPES)}",
        )

    conn = get_connection()
    try:
        court_date_id = create_court_date(
            conn, case_id, body.date, body.court.strip(), body.hearing_type
        )
    finally:
        conn.close()

    actor = current_user.get("name", f"User {current_user['user_id']}")
    hearing_label = body.hearing_type or "Court Date"
    date_str = body.date[:10]
    detail = f"{actor} scheduled {hearing_label} at {body.court.strip()} on {date_str}"

    db = get_mongo_db()
    add_timeline_event(
        db, case_id, "COURT_DATE_ADDED", current_user["user_id"],
        detail, created_by_name=actor,
    )
    log_audit_event(
        db, current_user["user_id"], "COURT_DATE_ADDED",
        detail, case_id=case_id, user_name=actor,
    )

    return {"court_date_id": court_date_id}


@router.delete("/cases/{case_id}/court-dates/{court_date_id}")
def remove_court_date(case_id: int, court_date_id: int,
                      current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        delete_court_date(conn, court_date_id)
    finally:
        conn.close()

    actor = current_user.get("name", f"User {current_user['user_id']}")
    detail = f"{actor} removed a court date from case #{case_id}"

    db = get_mongo_db()
    log_audit_event(
        db, current_user["user_id"], "COURT_DATE_REMOVED",
        detail, case_id=case_id, user_name=actor,
    )

    return {"ok": True}
