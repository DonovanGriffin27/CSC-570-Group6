# Authored by James Williams
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

from db.connection import get_connection
from db.mongo_connection import get_mongo_db
from db.queries.evidence_queries import (
    create_evidence, get_evidence_by_case, get_evidence_by_id,
    get_all_evidence, update_evidence_status,
)
from db.queries.custody_queries import create_custody_event, get_custody_chain
from db.queries.evidence_metadata_queries import (
    create_evidence_metadata, get_evidence_metadata,
)
from db.queries.mongo_queries import add_timeline_event, log_audit_event
from middleware.auth_middleware import get_current_user

router = APIRouter()


class EvidenceTypeEnum(str, Enum):
    PhysicalItem  = "Physical Item"
    DigitalFile   = "Digital File"
    Photo         = "Photo"
    Video         = "Video"
    Audio         = "Audio"
    Document      = "Document"
    Fingerprint   = "Fingerprint"
    DNA           = "DNA"
    Weapon        = "Weapon"
    DrugEvidence  = "Drug Evidence"
    Other         = "Other"


class EvidenceStatusEnum(str, Enum):
    Collected   = "Collected"
    InCustody   = "In Custody"
    InStorage   = "In Storage"
    InAnalysis  = "In Analysis"
    Released    = "Released"
    Disposed    = "Disposed"


class EvidenceConditionEnum(str, Enum):
    Sealed       = "Sealed"
    Unsealed     = "Unsealed"
    Damaged      = "Damaged"
    Contaminated = "Contaminated"
    Intact       = "Intact"
    Unknown      = "Unknown"


class CustodyActionEnum(str, Enum):
    COLLECTED                   = "COLLECTED"
    TRANSFERRED                 = "TRANSFERRED"
    PLACED_IN_STORAGE           = "PLACED_IN_STORAGE"
    REMOVED_FROM_STORAGE        = "REMOVED_FROM_STORAGE"
    SUBMITTED_FOR_ANALYSIS      = "SUBMITTED_FOR_ANALYSIS"
    ANALYSIS_COMPLETED          = "ANALYSIS_COMPLETED"
    RELEASED_TO_OWNER           = "RELEASED_TO_OWNER"
    RELEASED_TO_EXTERNAL_AGENCY = "RELEASED_TO_EXTERNAL_AGENCY"
    DISPOSED                    = "DISPOSED"


# custody action → resulting evidence status
_CUSTODY_STATUS = {
    "COLLECTED":                   "Collected",
    "TRANSFERRED":                 "In Custody",
    "PLACED_IN_STORAGE":           "In Storage",
    "REMOVED_FROM_STORAGE":        "In Custody",
    "SUBMITTED_FOR_ANALYSIS":      "In Analysis",
    "ANALYSIS_COMPLETED":          "In Custody",
    "RELEASED_TO_OWNER":           "Released",
    "RELEASED_TO_EXTERNAL_AGENCY": "Released",
    "DISPOSED":                    "Disposed",
}


class EvidenceCreate(BaseModel):
    case_id:              int
    evidence_type:        EvidenceTypeEnum
    description:          str
    current_status:       EvidenceStatusEnum    = EvidenceStatusEnum.Collected
    collected_by_user_id: int
    collection_location:  Optional[str]         = None
    condition_status:     EvidenceConditionEnum = EvidenceConditionEnum.Unknown
    # MongoDB metadata fields
    file_name:      Optional[str]        = None
    file_type:      Optional[str]        = None
    file_hash:      Optional[str]        = None
    metadata_tags:  Optional[List[str]]  = []
    source_device:  Optional[str]        = None
    gps_location:   Optional[str]        = None
    metadata_notes: Optional[str]        = None


class CustodyEventCreate(BaseModel):
    action_type:      CustodyActionEnum
    from_user_id:     Optional[int]                  = None
    to_user_id:       Optional[int]                  = None
    location:         Optional[str]                  = None
    condition_status: Optional[EvidenceConditionEnum] = None
    notes:            Optional[str]                  = None


# ── POST /evidence ────────────────────────────────────────────────────────────

@router.post("/evidence")
def intake_evidence(body: EvidenceCreate, current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        ev = create_evidence(
            conn,
            body.case_id,
            body.evidence_type.value,
            body.description,
            body.current_status.value,
            body.collected_by_user_id,
            body.collection_location,
            body.condition_status.value,
        )
        evidence_id = ev["evidence_id"]

        create_custody_event(
            conn, evidence_id,
            from_user_id=None,
            to_user_id=body.collected_by_user_id,
            action_type="COLLECTED",
            location=body.collection_location,
            condition_status=body.condition_status.value,
            notes="Initial collection",
        )
    finally:
        conn.close()

    db   = get_mongo_db()
    name = current_user.get("name", f"User {current_user['user_id']}")

    create_evidence_metadata(
        db, evidence_id, body.case_id, current_user["user_id"],
        file_name=body.file_name,
        file_type=body.file_type,
        file_hash=body.file_hash,
        metadata_tags=body.metadata_tags or [],
        source_device=body.source_device,
        gps_location=body.gps_location,
        notes=body.metadata_notes,
    )

    add_timeline_event(
        db, body.case_id, "EVIDENCE_ADDED", current_user["user_id"],
        f"Evidence added: {body.evidence_type.value} — {body.description[:60]}",
        created_by_name=name,
    )
    log_audit_event(
        db, current_user["user_id"], "EVIDENCE_CREATED",
        f"{name} added evidence ({body.evidence_type.value}) to case {body.case_id}",
        case_id=body.case_id, user_name=name,
    )

    return {"evidence_id": evidence_id, "intake_date": ev["intake_date"]}


# ── GET /evidence ─────────────────────────────────────────────────────────────
# Must be declared before /evidence/{evidence_id} so the literal path wins.

@router.get("/evidence")
def list_all_evidence(current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        return get_all_evidence(
            conn,
            role=current_user["role"],
            admin_level=current_user.get("admin_level"),
            user_id=current_user["user_id"],
            department_id=current_user.get("department_id"),
        )
    finally:
        conn.close()


# ── GET /evidence/case/{case_id} ─────────────────────────────────────────────
# Must be declared before /evidence/{evidence_id} so "case" is not treated as int.

@router.get("/evidence/case/{case_id}")
def list_evidence_for_case(case_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        return get_evidence_by_case(conn, case_id)
    finally:
        conn.close()


# ── GET /evidence/{evidence_id} ───────────────────────────────────────────────

@router.get("/evidence/{evidence_id}")
def get_evidence_detail(evidence_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        ev = get_evidence_by_id(conn, evidence_id)
        if not ev:
            raise HTTPException(status_code=404, detail="Evidence not found")
        custody = get_custody_chain(conn, evidence_id)
    finally:
        conn.close()

    db       = get_mongo_db()
    metadata = get_evidence_metadata(db, evidence_id)

    name = current_user.get("name", f"User {current_user['user_id']}")
    log_audit_event(
        db, current_user["user_id"], "EVIDENCE_VIEWED",
        f"{name} viewed evidence #{evidence_id} ({ev['evidence_type']}) on case {ev['case_id']}",
        case_id=ev["case_id"], user_name=name,
    )

    return {"evidence": ev, "metadata": metadata, "custody_chain": custody}


# ── GET /evidence/{evidence_id}/custody ──────────────────────────────────────

@router.get("/evidence/{evidence_id}/custody")
def get_evidence_custody(evidence_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        return get_custody_chain(conn, evidence_id)
    finally:
        conn.close()


# ── POST /evidence/{evidence_id}/custody ─────────────────────────────────────

@router.post("/evidence/{evidence_id}/custody")
def add_custody_event(evidence_id: int, body: CustodyEventCreate,
                      current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        ev = get_evidence_by_id(conn, evidence_id)
        if not ev:
            raise HTTPException(status_code=404, detail="Evidence not found")

        to_user_id = body.to_user_id if body.to_user_id is not None else current_user["user_id"]

        custody_event_id = create_custody_event(
            conn, evidence_id,
            from_user_id=body.from_user_id,
            to_user_id=to_user_id,
            action_type=body.action_type.value,
            location=body.location,
            condition_status=body.condition_status.value if body.condition_status else None,
            notes=body.notes,
        )

        new_status = _CUSTODY_STATUS.get(body.action_type.value)
        if new_status:
            update_evidence_status(conn, evidence_id, new_status)
    finally:
        conn.close()

    db   = get_mongo_db()
    name = current_user.get("name", f"User {current_user['user_id']}")

    add_timeline_event(
        db, ev["case_id"], "EVIDENCE_ADDED", current_user["user_id"],
        f"Custody event logged for evidence #{evidence_id}: {body.action_type.value}"
        + (f" — {body.notes}" if body.notes else ""),
        created_by_name=name,
    )
    log_audit_event(
        db, current_user["user_id"], "EVIDENCE_CUSTODY_UPDATED",
        f"{name} logged custody event ({body.action_type.value}) for evidence #{evidence_id}",
        case_id=ev["case_id"], user_name=name,
    )

    return {"custody_event_id": custody_event_id}
