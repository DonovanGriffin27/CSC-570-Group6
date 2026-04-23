from datetime import datetime, timezone


def _serialize(doc):
    doc["_id"] = str(doc["_id"])
    if "time_stamp" in doc and hasattr(doc["time_stamp"], "isoformat"):
        doc["time_stamp"] = doc["time_stamp"].isoformat()
    return doc


# ── Investigation Notes ──────────────────────────────────────────────────────

def add_investigation_note(db, case_id: int, author_user_id: int,
                           note_text: str, author_name: str = None) -> str:
    result = db.investigation_notes.insert_one({
        "case_id": case_id,
        "author_user_id": author_user_id,
        "author_name": author_name or f"User {author_user_id}",
        "note_text": note_text,
        "time_stamp": datetime.now(timezone.utc),
    })
    return str(result.inserted_id)


def get_notes_by_case(db, case_id: int) -> list:
    docs = db.investigation_notes.find({"case_id": case_id}).sort("time_stamp", -1)
    return [_serialize(d) for d in docs]


# ── Timeline Events ──────────────────────────────────────────────────────────

def add_timeline_event(db, case_id: int, event_type: str,
                       created_by_user_id: int, description: str,
                       created_by_name: str = None) -> str:
    result = db.timeline_events.insert_one({
        "case_id": case_id,
        "event_type": event_type,
        "created_by_user_id": created_by_user_id,
        "created_by_name": created_by_name or f"User {created_by_user_id}",
        "description": description,
        "time_stamp": datetime.now(timezone.utc),
    })
    return str(result.inserted_id)


def get_timeline_by_case(db, case_id: int) -> list:
    docs = db.timeline_events.find({"case_id": case_id}).sort("time_stamp", -1)
    return [_serialize(d) for d in docs]


# ── Audit Events ─────────────────────────────────────────────────────────────

def log_audit_event(db, user_id: int, action_type: str,
                    description: str, case_id: int = None,
                    user_name: str = None):
    doc = {
        "user_id": user_id,
        "user_name": user_name or f"User {user_id}",
        "action_type": action_type,
        "description": description,
        "time_stamp": datetime.now(timezone.utc),
    }
    if case_id is not None:
        doc["case_id"] = case_id
    db.audit_events.insert_one(doc)


def get_audit_by_case(db, case_id: int) -> list:
    docs = db.audit_events.find({"case_id": case_id}).sort("time_stamp", -1).limit(100)
    return [_serialize(d) for d in docs]


def get_audit_by_user(db, user_id: int) -> list:
    docs = db.audit_events.find({"user_id": user_id}).sort("time_stamp", -1).limit(50)
    return [_serialize(d) for d in docs]


def get_all_audit_events(db, limit: int = 500) -> list:
    docs = db.audit_events.find({}).sort("time_stamp", -1).limit(limit)
    return [_serialize(d) for d in docs]
