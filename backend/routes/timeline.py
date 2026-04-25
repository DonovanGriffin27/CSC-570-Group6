# Authored by James Williams
from fastapi import APIRouter, Depends
from db.mongo_connection import get_mongo_db
from db.queries.mongo_queries import get_timeline_by_case
from middleware.auth_middleware import get_current_user

router = APIRouter()


@router.get("/timeline/{case_id}")
def get_timeline(case_id: int, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    return get_timeline_by_case(db, case_id)
