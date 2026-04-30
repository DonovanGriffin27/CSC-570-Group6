# Authored by James Williams
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db.connection import get_connection
from db.queries.assignment_queries import assign_investigator, get_assignments_by_case, get_cases_by_investigator
from db.mongo_connection import get_mongo_db
from db.queries.mongo_queries import add_timeline_event, log_audit_event
from middleware.auth_middleware import get_current_user, require_admin

router = APIRouter()

class AssignmentCreate(BaseModel):
    case_id: int
    user_id: int

@router.post("/assignments")
def create_assignment(body: AssignmentCreate, current_user=Depends(require_admin)):
    conn = get_connection()
    try:
        assignment_id = assign_investigator(conn, body.case_id, body.user_id)
        with conn.cursor() as cur:
            cur.execute("SELECT first_name, last_name FROM users WHERE user_id = %s", (body.user_id,))
            row = cur.fetchone()
            inv_name = f"{row[0]} {row[1]}" if row else f"User {body.user_id}"
            cur.execute("SELECT case_number FROM cases WHERE case_id = %s", (body.case_id,))
            cn_row = cur.fetchone()
            case_number = cn_row[0] if cn_row else str(body.case_id)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    name = current_user.get("name", f"User {current_user['user_id']}")
    db = get_mongo_db()
    add_timeline_event(
        db, body.case_id, "STATUS_CHANGE", current_user["user_id"],
        f"{inv_name} assigned to case by {name}",
        created_by_name=name,
    )
    log_audit_event(
        db, current_user["user_id"], "INVESTIGATOR_ASSIGNED",
        f"{name} assigned {inv_name} to case {case_number}",
        case_id=body.case_id, user_name=name,
    )
    return {"assignment_id": assignment_id}

@router.get("/assignments/case/{case_id}")
def get_case_assignments(case_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        assignments = get_assignments_by_case(conn, case_id)
    finally:
        conn.close()
    return assignments

@router.get("/assignments/investigator/{user_id}")
def get_investigator_cases(user_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        cases = get_cases_by_investigator(conn, user_id)
    finally:
        conn.close()
    return cases
