# Authored by James Williams
from fastapi import APIRouter, Depends
from db.mongo_connection import get_mongo_db
from db.queries.mongo_queries import get_audit_by_case, get_audit_by_user
from middleware.auth_middleware import get_current_user, require_admin

router = APIRouter()


@router.get("/audit/case/{case_id}")
def get_case_audit(case_id: int, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    return get_audit_by_case(db, case_id)


@router.get("/audit/user/{user_id}")
def get_user_audit(user_id: int, current_user=Depends(require_admin)):
    db = get_mongo_db()
    return get_audit_by_user(db, user_id)
