from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db.mongo_connection import get_mongo_db
from db.queries.mongo_queries import (
    add_investigation_note, get_notes_by_case,
    add_timeline_event, log_audit_event,
)
from middleware.auth_middleware import get_current_user

router = APIRouter()


class NoteCreate(BaseModel):
    note_text: str


@router.get("/notes/{case_id}")
def get_notes(case_id: int, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    return get_notes_by_case(db, case_id)


@router.post("/notes/{case_id}")
def add_note(case_id: int, body: NoteCreate, current_user=Depends(get_current_user)):
    if not body.note_text.strip():
        raise HTTPException(status_code=400, detail="Note text cannot be empty")

    db = get_mongo_db()
    name = current_user.get("name", f"User {current_user['user_id']}")

    note_id = add_investigation_note(
        db, case_id, current_user["user_id"], body.note_text, author_name=name,
    )
    add_timeline_event(
        db, case_id, "NOTE_ADDED", current_user["user_id"],
        f"Investigation note added by {name}",
        created_by_name=name,
    )
    log_audit_event(
        db, current_user["user_id"], "NOTE_ADDED",
        f"{name} added a note to case {case_id}",
        case_id=case_id, user_name=name,
    )

    return {"note_id": note_id}
