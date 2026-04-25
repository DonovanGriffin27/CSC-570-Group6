"""
Case Management Tests
=====================
Covers: create, read, update cases and associated permission checks.
Investigators can read and update status; only ADMIN+ can create.
"""

import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import CASE, CLOSED_CASE


class TestCreateCase:
    """POST /cases"""

    def test_admin_creates_case(self, client, admin_headers):
        """ADMIN creates a case and receives case_id and case_number."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.create_case", return_value=(1, "CR-2024-000001")), \
             patch("routes.cases.get_mongo_db", return_value=MagicMock()), \
             patch("routes.cases.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/cases", json={"priority": "High"},
                              headers=admin_headers)

        assert res.status_code == 200
        body = res.json()
        assert body["case_id"] == 1
        assert body["case_number"] == "CR-2024-000001"

    def test_create_case_logs_audit(self, client, admin_headers):
        """CASE_CREATED event is logged on successful creation."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.create_case", return_value=(1, "CR-2024-000001")), \
             patch("routes.cases.get_mongo_db", return_value=MagicMock()), \
             patch("routes.cases.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.post("/cases", json={"priority": "Low"}, headers=admin_headers)

        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "CASE_CREATED"

    def test_investigator_cannot_create_case(self, client, inv_headers):
        """Investigator gets 403 when trying to create a case."""
        res = client.post("/cases", json={"priority": "Medium"}, headers=inv_headers)
        assert res.status_code == 403

    def test_create_case_no_auth(self, client):
        """No token → 403."""
        res = client.post("/cases", json={"priority": "Low"})
        assert res.status_code == 403

    def test_create_case_invalid_priority(self, client, admin_headers):
        """Priority not in enum → 422."""
        res = client.post("/cases", json={"priority": "Extreme"}, headers=admin_headers)
        assert res.status_code == 422

    def test_create_case_missing_priority(self, client, admin_headers):
        """Missing required priority field → 422."""
        res = client.post("/cases", json={}, headers=admin_headers)
        assert res.status_code == 422


class TestGetCase:
    """GET /cases/{case_id}"""

    def test_get_existing_case(self, client, inv_headers):
        """Returns the case dict for a valid case_id."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.get_case_by_id", return_value=CASE):
            mc.return_value = MagicMock()
            res = client.get("/cases/1", headers=inv_headers)

        assert res.status_code == 200
        body = res.json()
        assert body["case_id"] == 1
        assert body["case_number"] == "CR-2024-000001"
        assert body["status"] == "Open"

    def test_get_nonexistent_case(self, client, inv_headers):
        """Non-existent case_id → 404."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.get_case_by_id", return_value=None):
            mc.return_value = MagicMock()
            res = client.get("/cases/9999", headers=inv_headers)

        assert res.status_code == 404

    def test_get_case_no_auth(self, client):
        """No token → 403."""
        res = client.get("/cases/1")
        assert res.status_code == 403

    def test_get_closed_case_shows_date_closed(self, client, inv_headers):
        """Closed case includes a non-null date_closed field."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.get_case_by_id", return_value=CLOSED_CASE):
            mc.return_value = MagicMock()
            res = client.get("/cases/1", headers=inv_headers)

        assert res.status_code == 200
        assert res.json()["date_closed"] is not None


class TestGetAllCases:
    """GET /cases"""

    def test_returns_list(self, client, inv_headers):
        """Returns a list (may be empty)."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.get_all_cases", return_value=[CASE]):
            mc.return_value = MagicMock()
            res = client.get("/cases", headers=inv_headers)

        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_empty_list(self, client, inv_headers):
        """No cases → empty list, not 404."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.get_all_cases", return_value=[]):
            mc.return_value = MagicMock()
            res = client.get("/cases", headers=inv_headers)

        assert res.status_code == 200
        assert res.json() == []


class TestUpdateCase:
    """PATCH /cases/{case_id}"""

    def test_admin_updates_status(self, client, admin_headers):
        """ADMIN can change case status."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.get_case_by_id", return_value=CASE), \
             patch("routes.cases.update_case_details"), \
             patch("routes.cases.get_mongo_db", return_value=MagicMock()), \
             patch("routes.cases.log_audit_event"), \
             patch("routes.cases.add_timeline_event"):
            mc.return_value = MagicMock()
            res = client.patch("/cases/1", json={"status": "Closed"},
                               headers=admin_headers)

        assert res.status_code == 200

    def test_investigator_closes_case(self, client, inv_headers):
        """Investigators can change status (backend uses get_current_user, not require_admin)."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.get_case_by_id", return_value=CASE), \
             patch("routes.cases.update_case_details"), \
             patch("routes.cases.get_mongo_db", return_value=MagicMock()), \
             patch("routes.cases.log_audit_event"), \
             patch("routes.cases.add_timeline_event"):
            mc.return_value = MagicMock()
            res = client.patch("/cases/1", json={"status": "Closed"},
                               headers=inv_headers)

        assert res.status_code == 200

    def test_status_change_logs_timeline(self, client, admin_headers):
        """Status change triggers a STATUS_CHANGE timeline event."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.get_case_by_id", return_value=CASE), \
             patch("routes.cases.update_case_details"), \
             patch("routes.cases.get_mongo_db", return_value=MagicMock()), \
             patch("routes.cases.log_audit_event"), \
             patch("routes.cases.add_timeline_event") as mock_tl:
            mc.return_value = MagicMock()
            client.patch("/cases/1", json={"status": "In Progress"},
                         headers=admin_headers)

        mock_tl.assert_called_once()
        assert mock_tl.call_args[0][2] == "STATUS_CHANGE"

    def test_non_status_update_no_timeline(self, client, admin_headers):
        """Changing only title does NOT emit a timeline event."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.get_case_by_id", return_value=CASE), \
             patch("routes.cases.update_case_details"), \
             patch("routes.cases.get_mongo_db", return_value=MagicMock()), \
             patch("routes.cases.log_audit_event"), \
             patch("routes.cases.add_timeline_event") as mock_tl:
            mc.return_value = MagicMock()
            client.patch("/cases/1", json={"title": "New Title"},
                         headers=admin_headers)

        mock_tl.assert_not_called()

    def test_update_nonexistent_case(self, client, admin_headers):
        """Updating a case that doesn't exist → 404."""
        with patch("routes.cases.get_connection") as mc, \
             patch("routes.cases.get_case_by_id", return_value=None):
            mc.return_value = MagicMock()
            res = client.patch("/cases/9999", json={"status": "Closed"},
                               headers=admin_headers)

        assert res.status_code == 404

    def test_update_invalid_status(self, client, admin_headers):
        """Status value not in enum → 422."""
        res = client.patch("/cases/1", json={"status": "Limbo"},
                           headers=admin_headers)
        assert res.status_code == 422

    def test_update_no_auth(self, client):
        """No auth token → 403."""
        res = client.patch("/cases/1", json={"status": "Closed"})
        assert res.status_code == 403
