from fastapi import FastAPI
from pydantic import BaseModel
from db.connection import get_connection
from db.queries.case_queries import create_case, get_case_by_id, get_all_cases
from enum import Enum
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

#cd backend
#uvicorn main:app --reload


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PriorityEnum(str, Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"

class CaseCreate(BaseModel):
    title: str
    priority: PriorityEnum   



@app.post("/cases")
def create_case_route(case: CaseCreate):
    conn = get_connection()
    case_id = create_case(conn, case.title, case.priority)
    conn.close()
    return {"case_id": case_id}

@app.get("/cases/{case_id}")
def get_case_route(case_id: int):
    conn = get_connection()
    case = get_case_by_id(conn, case_id)
    conn.close()

    if case:
        return case
    raise HTTPException(status_code=404, detail="Case not found")
@app.get("/cases")

def get_all_cases_route():
    conn = get_connection()
    cases = get_all_cases(conn)
    conn.close()
    return cases