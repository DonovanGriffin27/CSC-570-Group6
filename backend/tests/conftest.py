"""
CaseVault Test Suite — Shared Fixtures
=======================================
Run from the backend/ directory:
    pytest tests/ -v

Single module:
    pytest tests/test_auth.py -v

Environment variables are set here before any app modules are imported,
because auth_service.py reads JWT_SECRET at import time.
"""

import os
import sys

# Must be set BEFORE importing the app
os.environ.setdefault("JWT_SECRET", "casevault_test_secret_32chars_abc!!")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_NAME", "casevault_test")
os.environ.setdefault("DB_USER", "postgres")
os.environ.setdefault("DB_PASS", "postgres")
os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017")

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from main import app
from services.auth_service import create_token


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def client():
    """Single TestClient shared across the session (no real DB needed)."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# JWT tokens — created with the same secret the middleware uses to verify
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def inv_token():
    """Investigator role token."""
    return create_token(1, "investigator@test.com", "investigator",
                        department_id=1, name="Test Investigator")


@pytest.fixture(scope="session")
def admin_token():
    """SUPER_ADMIN token — highest privilege."""
    return create_token(2, "superadmin@test.com", "admin",
                        admin_level="SUPER_ADMIN", department_id=1,
                        name="Super Admin")


@pytest.fixture(scope="session")
def op_admin_token():
    """ADMIN token — operational admin, not super."""
    return create_token(3, "admin@test.com", "admin",
                        admin_level="ADMIN", department_id=1,
                        name="Op Admin")


@pytest.fixture(scope="session")
def viewer_token():
    """VIEWER token — read-only admin level."""
    return create_token(4, "viewer@test.com", "admin",
                        admin_level="VIEWER", department_id=1,
                        name="Viewer Admin")


# ---------------------------------------------------------------------------
# Auth header shortcuts
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def inv_headers(inv_token):
    return {"Authorization": f"Bearer {inv_token}"}


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def op_admin_headers(op_admin_token):
    return {"Authorization": f"Bearer {op_admin_token}"}


@pytest.fixture(scope="session")
def viewer_headers(viewer_token):
    return {"Authorization": f"Bearer {viewer_token}"}


# ---------------------------------------------------------------------------
# Mock DB handles — reset per test so state never leaks between tests
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_conn():
    """Mock psycopg2 connection. MagicMock auto-handles cursor context manager."""
    return MagicMock()


@pytest.fixture
def mock_mongo():
    """Mock pymongo database handle."""
    return MagicMock()


# ---------------------------------------------------------------------------
# Canonical test objects reused across test modules
# ---------------------------------------------------------------------------

CASE = {
    "case_id": 1,
    "case_number": "CR-2024-000001",
    "title": "Warehouse Break-In",
    "status": "Open",
    "priority": "Medium",
    "date_opened": "2024-01-15T10:00:00",
    "date_closed": None,
}

CLOSED_CASE = {**CASE, "status": "Closed", "date_closed": "2024-06-01T00:00:00"}

EVIDENCE_ITEM = {
    "evidence_id": 10,
    "case_id": 1,
    "description": "Crowbar found at scene",
    "evidence_type": "Physical Item",
    "current_status": "Collected",
    "condition": "Intact",
}

CUSTODY_EVENT = {
    "event_id": 1,
    "evidence_id": 10,
    "action_type": "COLLECTED",
    "performed_by": 1,
    "timestamp": "2024-01-15T10:30:00",
    "notes": "",
}

PERSON = {
    "person_id": 5,
    "first_name": "John",
    "last_name": "Doe",
    "dob": "1990-01-01",
    "contact_phone": "555-0100",
}

SUSPECT = {**PERSON, "status": "Active", "risk_level": "Medium"}
VICTIM  = {**PERSON}

COURT_DATE = {
    "court_date_id": 3,
    "case_id": 1,
    "date": "2025-09-15T09:00:00",
    "court": "Superior Court of Los Angeles",
    "hearing_type": "Arraignment",
}

NOTE = {
    "_id": "abc123",
    "case_id": 1,
    "author_user_id": 1,
    "author_name": "Test Investigator",
    "note_text": "Witness confirmed the break-in occurred at midnight.",
    "time_stamp": "2024-01-16T08:00:00",
}

TIMELINE_EVENT = {
    "_id": "def456",
    "case_id": 1,
    "event_type": "NOTE_ADDED",
    "description": "Investigation note added by Test Investigator",
    "time_stamp": "2024-01-16T08:00:00",
}
