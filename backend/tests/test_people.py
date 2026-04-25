"""
People Tests (Suspects & Victims)
==================================
Covers: adding suspects/victims, updating suspect status and risk level,
removing people from a case, and retrieving the people list.

People records exist in a shared `person` table; case_suspect and case_victim
are join tables. The same person can appear on multiple cases.
"""

import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import PERSON, SUSPECT, VICTIM


SUSPECT_BODY = {
    "role": "suspect",
    "first_name": "John",
    "last_name": "Doe",
    "dob": "1990-05-15",
    "contact_phone": "555-0100",
    "status": "Active",
    "risk_level": "Medium",
}

VICTIM_BODY = {
    "role": "victim",
    "first_name": "Jane",
    "last_name": "Smith",
    "dob": None,
    "contact_phone": None,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _patch_people_write(case_number="CR-2024-000001"):
    """Context manager factory that patches all write-path dependencies."""
    return (
        patch("routes.people.get_connection"),
        patch("routes.people._case_number", return_value=case_number),
        patch("routes.people.get_mongo_db", return_value=MagicMock()),
        patch("routes.people.add_timeline_event"),
        patch("routes.people.log_audit_event"),
    )


class TestGetPeople:
    """GET /cases/{case_id}/people"""

    def test_returns_suspects_and_victims(self, client, inv_headers):
        """Response has 'suspects' and 'victims' keys."""
        payload = {"suspects": [SUSPECT], "victims": [VICTIM]}
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people.get_case_people", return_value=payload):
            mc.return_value = MagicMock()
            res = client.get("/cases/1/people", headers=inv_headers)

        assert res.status_code == 200
        body = res.json()
        assert "suspects" in body
        assert "victims" in body

    def test_empty_case_has_both_keys(self, client, inv_headers):
        """Even with no people, both keys are present."""
        payload = {"suspects": [], "victims": []}
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people.get_case_people", return_value=payload):
            mc.return_value = MagicMock()
            res = client.get("/cases/1/people", headers=inv_headers)

        assert res.status_code == 200
        assert res.json()["suspects"] == []
        assert res.json()["victims"] == []

    def test_get_people_no_auth(self, client):
        res = client.get("/cases/1/people")
        assert res.status_code == 403


class TestAddSuspect:
    """POST /cases/{case_id}/people with role=suspect"""

    def test_add_suspect_success(self, client, inv_headers):
        """Returns person_id on successful suspect creation."""
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people._case_number", return_value="CR-2024-000001"), \
             patch("routes.people.create_person", return_value=5), \
             patch("routes.people.add_suspect"), \
             patch("routes.people.get_mongo_db", return_value=MagicMock()), \
             patch("routes.people.add_timeline_event"), \
             patch("routes.people.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/cases/1/people", json=SUSPECT_BODY,
                              headers=inv_headers)

        assert res.status_code == 200
        assert res.json()["person_id"] == 5

    def test_add_suspect_logs_audit_and_timeline(self, client, inv_headers):
        """Adding a suspect emits SUSPECT_ADDED to both audit and timeline."""
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people._case_number", return_value="CR-2024-000001"), \
             patch("routes.people.create_person", return_value=5), \
             patch("routes.people.add_suspect"), \
             patch("routes.people.get_mongo_db", return_value=MagicMock()), \
             patch("routes.people.add_timeline_event") as mock_tl, \
             patch("routes.people.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.post("/cases/1/people", json=SUSPECT_BODY, headers=inv_headers)

        mock_tl.assert_called_once()
        assert mock_tl.call_args[0][2] == "SUSPECT_ADDED"
        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "SUSPECT_ADDED"

    def test_add_suspect_default_status_active(self, client, inv_headers):
        """Suspect defaults to Active status when not provided."""
        body = {**SUSPECT_BODY}
        del body["status"]
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people._case_number", return_value="CR-2024-000001"), \
             patch("routes.people.create_person", return_value=5), \
             patch("routes.people.add_suspect") as mock_add, \
             patch("routes.people.get_mongo_db", return_value=MagicMock()), \
             patch("routes.people.add_timeline_event"), \
             patch("routes.people.log_audit_event"):
            mc.return_value = MagicMock()
            client.post("/cases/1/people", json=body, headers=inv_headers)

        # Third positional arg to add_suspect is status
        assert mock_add.call_args[0][3] == "Active"

    def test_add_suspect_invalid_status(self, client, inv_headers):
        """Invalid suspect status → 400."""
        body = {**SUSPECT_BODY, "status": "Disappeared"}
        with patch("routes.people.get_connection") as mc:
            mc.return_value = MagicMock()
            res = client.post("/cases/1/people", json=body, headers=inv_headers)
        assert res.status_code == 400

    def test_add_suspect_invalid_risk_level(self, client, inv_headers):
        """Invalid risk_level → 400."""
        body = {**SUSPECT_BODY, "risk_level": "Extreme"}
        with patch("routes.people.get_connection") as mc:
            mc.return_value = MagicMock()
            res = client.post("/cases/1/people", json=body, headers=inv_headers)
        assert res.status_code == 400

    def test_add_person_missing_first_name(self, client, inv_headers):
        """Missing first_name → 400."""
        body = {**SUSPECT_BODY, "first_name": ""}
        with patch("routes.people.get_connection") as mc:
            mc.return_value = MagicMock()
            res = client.post("/cases/1/people", json=body, headers=inv_headers)
        assert res.status_code == 400

    def test_add_person_missing_last_name(self, client, inv_headers):
        """Missing last_name → 400."""
        body = {**SUSPECT_BODY, "last_name": "   "}
        with patch("routes.people.get_connection") as mc:
            mc.return_value = MagicMock()
            res = client.post("/cases/1/people", json=body, headers=inv_headers)
        assert res.status_code == 400

    def test_add_person_invalid_role(self, client, inv_headers):
        """Invalid role → 400."""
        body = {**SUSPECT_BODY, "role": "witness"}
        with patch("routes.people.get_connection") as mc:
            mc.return_value = MagicMock()
            res = client.post("/cases/1/people", json=body, headers=inv_headers)
        assert res.status_code == 400


class TestAddVictim:
    """POST /cases/{case_id}/people with role=victim"""

    def test_add_victim_success(self, client, inv_headers):
        """Returns person_id when victim is added."""
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people._case_number", return_value="CR-2024-000001"), \
             patch("routes.people.create_person", return_value=6), \
             patch("routes.people.add_victim"), \
             patch("routes.people.get_mongo_db", return_value=MagicMock()), \
             patch("routes.people.add_timeline_event"), \
             patch("routes.people.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/cases/1/people", json=VICTIM_BODY,
                              headers=inv_headers)

        assert res.status_code == 200
        assert res.json()["person_id"] == 6

    def test_add_victim_logs_victim_added(self, client, inv_headers):
        """VICTIM_ADDED event is emitted, not SUSPECT_ADDED."""
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people._case_number", return_value="CR-2024-000001"), \
             patch("routes.people.create_person", return_value=6), \
             patch("routes.people.add_victim"), \
             patch("routes.people.get_mongo_db", return_value=MagicMock()), \
             patch("routes.people.add_timeline_event") as mock_tl, \
             patch("routes.people.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.post("/cases/1/people", json=VICTIM_BODY, headers=inv_headers)

        assert mock_tl.call_args[0][2] == "VICTIM_ADDED"
        assert mock_audit.call_args[0][2] == "VICTIM_ADDED"


class TestUpdateSuspect:
    """PATCH /cases/{case_id}/suspects/{person_id}"""

    def test_update_status_to_arrested(self, client, inv_headers):
        """Valid status update returns 200."""
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people._case_number", return_value="CR-2024-000001"), \
             patch("routes.people.update_suspect"), \
             patch("routes.people.get_mongo_db", return_value=MagicMock()), \
             patch("routes.people.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.patch("/cases/1/suspects/5",
                               json={"status": "Arrested"}, headers=inv_headers)

        assert res.status_code == 200

    def test_update_risk_level(self, client, inv_headers):
        """Valid risk level update returns 200."""
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people._case_number", return_value="CR-2024-000001"), \
             patch("routes.people.update_suspect"), \
             patch("routes.people.get_mongo_db", return_value=MagicMock()), \
             patch("routes.people.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.patch("/cases/1/suspects/5",
                               json={"risk_level": "High"}, headers=inv_headers)

        assert res.status_code == 200

    def test_update_logs_suspect_updated(self, client, inv_headers):
        """SUSPECT_UPDATED audit event is emitted."""
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people._case_number", return_value="CR-2024-000001"), \
             patch("routes.people.update_suspect"), \
             patch("routes.people.get_mongo_db", return_value=MagicMock()), \
             patch("routes.people.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.patch("/cases/1/suspects/5",
                         json={"status": "Cleared"}, headers=inv_headers)

        assert mock_audit.call_args[0][2] == "SUSPECT_UPDATED"

    def test_update_invalid_status(self, client, inv_headers):
        """Invalid status → 400."""
        res = client.patch("/cases/1/suspects/5",
                           json={"status": "Vanished"}, headers=inv_headers)
        assert res.status_code == 400

    def test_update_all_valid_statuses(self, client, inv_headers):
        """Active, Cleared, Arrested are all valid."""
        for st in ("Active", "Cleared", "Arrested"):
            with patch("routes.people.get_connection") as mc, \
                 patch("routes.people._case_number", return_value="CR-2024-000001"), \
                 patch("routes.people.update_suspect"), \
                 patch("routes.people.get_mongo_db", return_value=MagicMock()), \
                 patch("routes.people.log_audit_event"):
                mc.return_value = MagicMock()
                res = client.patch("/cases/1/suspects/5",
                                   json={"status": st}, headers=inv_headers)
            assert res.status_code == 200, f"Status '{st}' was rejected"


class TestRemovePeople:
    """DELETE /cases/{case_id}/suspects/{person_id}
       DELETE /cases/{case_id}/victims/{person_id}"""

    def test_remove_suspect(self, client, inv_headers):
        """Removing a suspect returns 200 and logs SUSPECT_REMOVED."""
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people._case_number", return_value="CR-2024-000001"), \
             patch("routes.people.remove_suspect"), \
             patch("routes.people.get_mongo_db", return_value=MagicMock()), \
             patch("routes.people.add_timeline_event") as mock_tl, \
             patch("routes.people.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            res = client.delete("/cases/1/suspects/5", headers=inv_headers)

        assert res.status_code == 200
        assert mock_tl.call_args[0][2] == "SUSPECT_REMOVED"
        assert mock_audit.call_args[0][2] == "SUSPECT_REMOVED"

    def test_remove_victim(self, client, inv_headers):
        """Removing a victim returns 200 and logs VICTIM_REMOVED."""
        with patch("routes.people.get_connection") as mc, \
             patch("routes.people._case_number", return_value="CR-2024-000001"), \
             patch("routes.people.remove_victim"), \
             patch("routes.people.get_mongo_db", return_value=MagicMock()), \
             patch("routes.people.add_timeline_event") as mock_tl, \
             patch("routes.people.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            res = client.delete("/cases/1/victims/6", headers=inv_headers)

        assert res.status_code == 200
        assert mock_tl.call_args[0][2] == "VICTIM_REMOVED"
        assert mock_audit.call_args[0][2] == "VICTIM_REMOVED"

    def test_delete_no_auth(self, client):
        res = client.delete("/cases/1/suspects/5")
        assert res.status_code == 403
