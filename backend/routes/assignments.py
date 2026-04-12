from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.connection import get_connection
from db.queries.assignment_queries import assign_investigator, get_assignments_by_case, get_cases_by_investigator

router = APIRouter()

class AssignmentCreate(BaseModel):
    case_id: int
    user_id: int

@router.post("/assignments")
def create_assignment(body: AssignmentCreate):
    conn = get_connection()
    try:
        assignment_id = assign_investigator(conn, body.case_id, body.user_id)
        return {"assignment_id": assignment_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/assignments/case/{case_id}")
def get_case_assignments(case_id: int):
    conn = get_connection()
    assignments = get_assignments_by_case(conn, case_id)
    conn.close()
    if not assignments:
        raise HTTPException(status_code=404, detail="No assignments found for this case")
    return assignments

@router.get("/assignments/investigator/{user_id}")
def get_investigator_cases(user_id: int):
    conn = get_connection()
    cases = get_cases_by_investigator(conn, user_id)
    conn.close()
    return cases