from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db.connection import get_connection
from db.queries.case_queries import get_all_cases_overview
from db.queries.user_queries import get_all_investigators, get_all_admins, update_admin_level
from db.mongo_connection import get_mongo_db
from db.queries.mongo_queries import add_timeline_event, log_audit_event, get_all_audit_events
from middleware.auth_middleware import require_admin, require_super_admin, require_any_admin
from db.queries.assignment_queries import assign_investigator

router = APIRouter(prefix="/admin")

VALID_ADMIN_LEVELS = {"SUPER_ADMIN", "ADMIN", "SUPERVISOR", "VIEWER"}


def _dept_scope(admin: dict):
    """Return the department_id to filter by, or None if super admin (sees all)."""
    if admin.get("admin_level") == "SUPER_ADMIN":
        return None
    return admin.get("department_id")


# ── Cases overview ───────────────────────────────────────────────────────────

@router.get("/cases")
def admin_get_cases(admin=Depends(require_admin)):
    conn = get_connection()
    try:
        return get_all_cases_overview(conn, department_id=_dept_scope(admin))
    finally:
        conn.close()


# ── Investigators list (for assignment dropdown) ─────────────────────────────

@router.get("/investigators")
def admin_get_investigators(admin=Depends(require_admin)):
    conn = get_connection()
    try:
        return get_all_investigators(conn, department_id=_dept_scope(admin))
    finally:
        conn.close()


# ── Assign investigator to case ──────────────────────────────────────────────

class AssignBody(BaseModel):
    user_id: int


@router.post("/cases/{case_id}/assign")
def admin_assign_investigator(case_id: int, body: AssignBody, admin=Depends(require_admin)):
    conn = get_connection()
    try:
        assignment_id = assign_investigator(conn, case_id, body.user_id)
        with conn.cursor() as cur:
            cur.execute("SELECT first_name, last_name FROM users WHERE user_id = %s", (body.user_id,))
            row = cur.fetchone()
            inv_name = f"{row[0]} {row[1]}" if row else f"User {body.user_id}"
            cur.execute("SELECT case_number FROM cases WHERE case_id = %s", (case_id,))
            cn_row = cur.fetchone()
            case_number = cn_row[0] if cn_row else str(case_id)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    admin_name = admin.get("name", f"User {admin['user_id']}")
    db = get_mongo_db()
    add_timeline_event(
        db, case_id, "STATUS_CHANGE", admin["user_id"],
        f"{inv_name} assigned to case by {admin_name}",
        created_by_name=admin_name,
    )
    log_audit_event(
        db, admin["user_id"], "INVESTIGATOR_ASSIGNED",
        f"{admin_name} assigned {inv_name} to case {case_number}",
        case_id=case_id, user_name=admin_name,
    )

    return {"assignment_id": assignment_id}


@router.get("/audit")
def get_audit_log(admin=Depends(require_any_admin)):
    db = get_mongo_db()
    return get_all_audit_events(db)


# ── Admin management (SUPER_ADMIN only) ─────────────────────────────────────

@router.get("/admins")
def list_admins(admin=Depends(require_super_admin)):
    conn = get_connection()
    try:
        return get_all_admins(conn)
    finally:
        conn.close()


class LevelUpdate(BaseModel):
    admin_level: str


@router.patch("/admins/{user_id}/level")
def change_admin_level(user_id: int, body: LevelUpdate, admin=Depends(require_super_admin)):
    if body.admin_level not in VALID_ADMIN_LEVELS:
        raise HTTPException(
            status_code=400,
            detail=f"admin_level must be one of: {', '.join(sorted(VALID_ADMIN_LEVELS))}",
        )
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot change your own admin level.")

    conn = get_connection()
    try:
        update_admin_level(conn, user_id, body.admin_level)
    finally:
        conn.close()

    admin_name = admin.get("name", f"User {admin['user_id']}")
    db = get_mongo_db()
    log_audit_event(
        db, admin["user_id"], "ADMIN_LEVEL_CHANGED",
        f"{admin_name} changed admin level of user {user_id} to {body.admin_level}",
        user_name=admin_name,
    )

    return {"message": f"Admin level updated to {body.admin_level}"}
