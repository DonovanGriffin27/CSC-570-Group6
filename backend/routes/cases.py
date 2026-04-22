from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.connection import get_connection
from db.queries.case_queries import create_case, get_case_by_id, get_all_cases, update_case_details
from db.mongo_connection import get_mongo_db
from db.queries.mongo_queries import add_timeline_event, log_audit_event
from middleware.auth_middleware import get_current_user, require_admin
from enum import Enum

router = APIRouter()

class PriorityEnum(str, Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"

class StatusEnum(str, Enum):
    Open = "Open"
    InProgress = "In Progress"
    Closed = "Closed"

class CaseCreate(BaseModel):
    priority: PriorityEnum

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    status: Optional[StatusEnum] = None

@router.post("/cases")
def create_case_route(case: CaseCreate, current_user=Depends(require_admin)):
    conn = get_connection()
    case_id, case_number = create_case(conn, case.priority)
    conn.close()
    return {"case_id": case_id, "case_number": case_number}

@router.patch("/cases/{case_id}")
def update_case_route(case_id: int, body: CaseUpdate, current_user=Depends(get_current_user)):
    conn = get_connection()
    case = get_case_by_id(conn, case_id)
    if not case:
        conn.close()
        raise HTTPException(status_code=404, detail="Case not found")
    update_case_details(conn, case_id, body.title, body.priority, body.status)
    conn.close()

    name = current_user.get("name", f"User {current_user['user_id']}")
    db = get_mongo_db()
    if body.status and body.status != case.get("status"):
        add_timeline_event(
            db, case_id, "STATUS_CHANGE", current_user["user_id"],
            f"Status changed to {body.status} by {name}",
            created_by_name=name,
        )
    log_audit_event(
        db, current_user["user_id"], "CASE_UPDATED",
        f"{name} updated case {case_id}",
        case_id=case_id, user_name=name,
    )

    return {"message": "Case updated"}

@router.get("/cases/{case_id}")
def get_case_route(case_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()
    case = get_case_by_id(conn, case_id)
    conn.close()
    if case:
        return case
    raise HTTPException(status_code=404, detail="Case not found")

@router.get("/cases")
def get_all_cases_route(current_user=Depends(get_current_user)):
    conn = get_connection()
    cases = get_all_cases(conn)
    conn.close()
    return cases
