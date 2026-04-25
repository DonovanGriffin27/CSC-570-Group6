"""
Investigation Notes Tests
=========================
Notes are stored in MongoDB. Every note also emits a timeline event.
"""

import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import NOTE, TIMELINE_EVENT


class TestGetNotes:
    """GET /notes/{case_id}"""

    def test_returns_list(self, client, inv_headers):
        """Returns list of notes for the case."""
        with patch("routes.notes.get_mongo_db", return_value=MagicMock()), \
             patch("routes.notes.get_notes_by_case", return_value=[NOTE]):
            res = client.get("/notes/1", headers=inv_headers)

        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert data[0]["note_text"] == NOTE["note_text"]

    def test_empty_returns_empty_list(self, client, inv_headers):
        """No notes → empty list, not 404."""
        with patch("routes.notes.get_mongo_db", return_value=MagicMock()), \
             patch("routes.notes.get_notes_by_case", return_value=[]):
            res = client.get("/notes/99", headers=inv_headers)

        assert res.status_code == 200
        assert res.json() == []

    def test_no_auth(self, client):
        res = client.get("/notes/1")
        assert res.status_code == 403


class TestAddNote:
    """POST /notes/{case_id}"""

    def test_add_valid_note(self, client, inv_headers):
        """Returns note_id on successful note creation."""
        with patch("routes.notes.get_mongo_db", return_value=MagicMock()), \
             patch("routes.notes.add_investigation_note", return_value="abc123"), \
             patch("routes.notes.add_timeline_event"), \
             patch("routes.notes.log_audit_event"):
            res = client.post("/notes/1",
                              json={"note_text": "Witness confirmed entry at midnight."},
                              headers=inv_headers)

        assert res.status_code == 200
        assert res.json()["note_id"] == "abc123"

    def test_add_note_logs_audit_and_timeline(self, client, inv_headers):
        """Adding a note emits NOTE_ADDED to both audit and timeline."""
        with patch("routes.notes.get_mongo_db", return_value=MagicMock()), \
             patch("routes.notes.add_investigation_note", return_value="abc123"), \
             patch("routes.notes.add_timeline_event") as mock_tl, \
             patch("routes.notes.log_audit_event") as mock_audit:
            client.post("/notes/1",
                        json={"note_text": "Test note."},
                        headers=inv_headers)

        mock_tl.assert_called_once()
        assert mock_tl.call_args[0][2] == "NOTE_ADDED"
        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "NOTE_ADDED"

    def test_empty_note_rejected(self, client, inv_headers):
        """Blank note_text → 400."""
        res = client.post("/notes/1",
                          json={"note_text": "   "},
                          headers=inv_headers)
        assert res.status_code == 400

    def test_missing_note_text(self, client, inv_headers):
        """Missing note_text field → 422."""
        res = client.post("/notes/1", json={}, headers=inv_headers)
        assert res.status_code == 422

    def test_add_note_no_auth(self, client):
        res = client.post("/notes/1", json={"note_text": "Test"})
        assert res.status_code == 403
