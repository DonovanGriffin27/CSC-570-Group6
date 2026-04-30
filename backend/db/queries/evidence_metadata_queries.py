# Authored by James Williams
from datetime import datetime, timezone


def _serialize(doc):
    doc["_id"] = str(doc["_id"])
    for key in ("time_stamp", "created_at"):
        if key in doc and hasattr(doc[key], "isoformat"):
            doc[key] = doc[key].isoformat()
    return doc


def create_evidence_metadata(db, evidence_id: int, case_id: int,
                              created_by_user_id: int, **kwargs) -> str:
    # Required fields always present
    doc = {
        "evidence_id": evidence_id,
        "case_id": case_id,
        "created_by_user_id": created_by_user_id,
        "created_at": datetime.now(timezone.utc),
        "metadata_tags": kwargs.get("metadata_tags") or [],
    }
    # Optional string fields: only include when the caller provides a value.
    # The MongoDB schema validator rejects null for typed fields, so we omit
    # rather than storing null.
    for key in ("file_name", "file_type", "file_hash", "source_device", "gps_location", "notes"):
        val = kwargs.get(key)
        if val is not None:
            doc[key] = val
    result = db.evidence_metadata.insert_one(doc)
    return str(result.inserted_id)


def get_evidence_metadata(db, evidence_id: int) -> dict | None:
    doc = db.evidence_metadata.find_one({"evidence_id": evidence_id})
    if not doc:
        return None
    return _serialize(doc)


def update_evidence_file(db, evidence_id: int, storage_path: str, file_name: str, file_type: str):
    db.evidence_metadata.update_one(
        {"evidence_id": evidence_id},
        {"$set": {"storage_path": storage_path, "file_name": file_name, "file_type": file_type}},
        upsert=True,
    )
