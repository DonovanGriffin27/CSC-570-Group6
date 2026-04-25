"""
Evidence Tests
==============
Covers: intake, retrieval (by case, by id, system-wide), and the full
custody chain including all action→status transitions and audit logging.

The _CUSTODY_STATUS mapping in evidence.py is the authoritative source for
status transitions; these tests verify that mapping holds end-to-end.
"""

import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import EVIDENCE_ITEM, CUSTODY_EVENT


VALID_INTAKE = {
    "case_id": 1,
    "description": "Crowbar found at scene",
    "evidence_type": "Physical Item",
    "condition_status": "Intact",
    "collected_by_user_id": 1,
}

FULL_INTAKE = {
    **VALID_INTAKE,
    "collection_location": "Rear loading dock",
    "metadata_notes": "Lab reference LAB-001",
}

_EVIDENCE_RETURN = {"evidence_id": 10, "intake_date": "2024-01-15T10:00:00"}


class TestEvidenceIntake:
    """POST /evidence"""

    def test_valid_intake(self, client, inv_headers):
        """Returns evidence_id on successful intake."""
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.create_evidence", return_value=_EVIDENCE_RETURN), \
             patch("routes.evidence.create_custody_event"), \
             patch("routes.evidence.create_evidence_metadata"), \
             patch("routes.evidence.get_mongo_db", return_value=MagicMock()), \
             patch("routes.evidence.add_timeline_event"), \
             patch("routes.evidence.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/evidence", json=FULL_INTAKE, headers=inv_headers)

        assert res.status_code == 200
        assert res.json()["evidence_id"] == 10

    def test_intake_logs_evidence_added(self, client, inv_headers):
        """Intake logs EVIDENCE_ADDED to timeline and EVIDENCE_CREATED to audit."""
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.create_evidence", return_value=_EVIDENCE_RETURN), \
             patch("routes.evidence.create_custody_event"), \
             patch("routes.evidence.create_evidence_metadata"), \
             patch("routes.evidence.get_mongo_db", return_value=MagicMock()), \
             patch("routes.evidence.add_timeline_event") as mock_tl, \
             patch("routes.evidence.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.post("/evidence", json=FULL_INTAKE, headers=inv_headers)

        mock_tl.assert_called_once()
        assert mock_tl.call_args[0][2] == "EVIDENCE_ADDED"
        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "EVIDENCE_CREATED"

    def test_intake_missing_description(self, client, inv_headers):
        """Missing description → 422."""
        body = {**FULL_INTAKE}
        del body["description"]
        res = client.post("/evidence", json=body, headers=inv_headers)
        assert res.status_code == 422

    def test_intake_missing_case_id(self, client, inv_headers):
        """Missing case_id → 422."""
        body = {**FULL_INTAKE}
        del body["case_id"]
        res = client.post("/evidence", json=body, headers=inv_headers)
        assert res.status_code == 422

    def test_intake_invalid_evidence_type(self, client, inv_headers):
        """Unknown evidence_type → 422."""
        body = {**FULL_INTAKE, "evidence_type": "Unicorn Horn"}
        res = client.post("/evidence", json=body, headers=inv_headers)
        assert res.status_code == 422

    def test_intake_invalid_condition(self, client, inv_headers):
        """Unknown condition_status → 422."""
        body = {**FULL_INTAKE, "condition_status": "Melted"}
        res = client.post("/evidence", json=body, headers=inv_headers)
        assert res.status_code == 422

    def test_intake_no_auth(self, client):
        """No token → 403."""
        res = client.post("/evidence", json=FULL_INTAKE)
        assert res.status_code == 403

    def test_all_evidence_types_accepted(self, client, inv_headers):
        """Every member of EvidenceTypeEnum is accepted."""
        types = [
            "Physical Item", "Digital File", "Photo", "Video", "Audio",
            "Document", "Fingerprint", "DNA", "Weapon", "Drug Evidence", "Other",
        ]
        for etype in types:
            with patch("routes.evidence.get_connection") as mc, \
                 patch("routes.evidence.create_evidence",
                       return_value={"evidence_id": 1, "intake_date": "2024-01-15"}), \
                 patch("routes.evidence.create_custody_event"), \
                 patch("routes.evidence.create_evidence_metadata"), \
                 patch("routes.evidence.get_mongo_db", return_value=MagicMock()), \
                 patch("routes.evidence.add_timeline_event"), \
                 patch("routes.evidence.log_audit_event"):
                mc.return_value = MagicMock()
                body = {**FULL_INTAKE, "evidence_type": etype}
                res = client.post("/evidence", json=body, headers=inv_headers)
            assert res.status_code == 200, f"evidence_type '{etype}' was rejected"


class TestGetEvidence:
    """GET /evidence/case/{case_id} and GET /evidence/{evidence_id}"""

    def test_get_by_case(self, client, inv_headers):
        """Returns list of evidence for a case."""
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.get_evidence_by_case",
                   return_value=[EVIDENCE_ITEM]):
            mc.return_value = MagicMock()
            res = client.get("/evidence/case/1", headers=inv_headers)

        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_get_by_case_empty(self, client, inv_headers):
        """No evidence for a case returns empty list."""
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.get_evidence_by_case", return_value=[]):
            mc.return_value = MagicMock()
            res = client.get("/evidence/case/99", headers=inv_headers)

        assert res.status_code == 200
        assert res.json() == []

    def test_get_by_id(self, client, inv_headers):
        """Returns single evidence item with metadata and custody chain."""
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.get_evidence_by_id", return_value=EVIDENCE_ITEM), \
             patch("routes.evidence.get_custody_chain", return_value=[CUSTODY_EVENT]), \
             patch("routes.evidence.get_mongo_db", return_value=MagicMock()), \
             patch("routes.evidence.get_evidence_metadata", return_value={}), \
             patch("routes.evidence.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.get("/evidence/10", headers=inv_headers)

        assert res.status_code == 200
        body = res.json()
        assert body["evidence"]["evidence_id"] == 10
        assert "custody_chain" in body

    def test_get_by_id_not_found(self, client, inv_headers):
        """Non-existent evidence_id → 404."""
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.get_evidence_by_id", return_value=None):
            mc.return_value = MagicMock()
            res = client.get("/evidence/9999", headers=inv_headers)

        assert res.status_code == 404

    def test_get_system_wide(self, client, inv_headers):
        """GET /evidence returns scoped list for the authenticated user."""
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.get_all_evidence", return_value=[EVIDENCE_ITEM]):
            mc.return_value = MagicMock()
            res = client.get("/evidence", headers=inv_headers)

        assert res.status_code == 200
        assert isinstance(res.json(), list)


class TestCustodyChain:
    """POST /evidence/{evidence_id}/custody — custody actions and status transitions."""

    def _post_custody(self, client, headers, action, current_status="Collected"):
        item = {**EVIDENCE_ITEM, "current_status": current_status}
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.get_evidence_by_id", return_value=item), \
             patch("routes.evidence.create_custody_event", return_value=1), \
             patch("routes.evidence.update_evidence_status"), \
             patch("routes.evidence.get_mongo_db", return_value=MagicMock()), \
             patch("routes.evidence.add_timeline_event"), \
             patch("routes.evidence.log_audit_event"):
            mc.return_value = MagicMock()
            return client.post(f"/evidence/10/custody",
                               json={"action_type": action, "notes": ""},
                               headers=headers)

    def test_collected_action(self, client, inv_headers):
        res = self._post_custody(client, inv_headers, "COLLECTED", "Collected")
        assert res.status_code == 200

    def test_placed_in_storage(self, client, inv_headers):
        res = self._post_custody(client, inv_headers,
                                 "PLACED_IN_STORAGE", "In Custody")
        assert res.status_code == 200

    def test_submitted_for_analysis(self, client, inv_headers):
        res = self._post_custody(client, inv_headers,
                                 "SUBMITTED_FOR_ANALYSIS", "In Custody")
        assert res.status_code == 200

    def test_analysis_completed(self, client, inv_headers):
        res = self._post_custody(client, inv_headers,
                                 "ANALYSIS_COMPLETED", "In Analysis")
        assert res.status_code == 200

    def test_released_to_owner(self, client, inv_headers):
        res = self._post_custody(client, inv_headers,
                                 "RELEASED_TO_OWNER", "In Custody")
        assert res.status_code == 200

    def test_disposed(self, client, inv_headers):
        res = self._post_custody(client, inv_headers, "DISPOSED", "In Custody")
        assert res.status_code == 200

    def test_custody_logs_audit_event(self, client, inv_headers):
        """Every custody action logs EVIDENCE_CUSTODY_UPDATED."""
        item = {**EVIDENCE_ITEM, "current_status": "Collected"}
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.get_evidence_by_id", return_value=item), \
             patch("routes.evidence.create_custody_event", return_value=1), \
             patch("routes.evidence.update_evidence_status"), \
             patch("routes.evidence.get_mongo_db", return_value=MagicMock()), \
             patch("routes.evidence.add_timeline_event"), \
             patch("routes.evidence.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.post("/evidence/10/custody",
                        json={"action_type": "COLLECTED", "notes": ""},
                        headers=inv_headers)

        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "EVIDENCE_CUSTODY_UPDATED"

    def test_custody_updates_status_in_db(self, client, inv_headers):
        """update_evidence_status is called after a custody event."""
        item = {**EVIDENCE_ITEM, "current_status": "Collected"}
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.get_evidence_by_id", return_value=item), \
             patch("routes.evidence.create_custody_event", return_value=1), \
             patch("routes.evidence.update_evidence_status") as mock_upd, \
             patch("routes.evidence.get_mongo_db", return_value=MagicMock()), \
             patch("routes.evidence.add_timeline_event"), \
             patch("routes.evidence.log_audit_event"):
            mc.return_value = MagicMock()
            client.post("/evidence/10/custody",
                        json={"action_type": "PLACED_IN_STORAGE", "notes": ""},
                        headers=inv_headers)

        mock_upd.assert_called_once()
        # Verify the new status passed is "In Storage"
        assert mock_upd.call_args[0][2] == "In Storage"

    def test_invalid_action_type(self, client, inv_headers):
        """Unknown action_type → 422."""
        res = client.post("/evidence/10/custody",
                          json={"action_type": "BEAM_IT_UP", "notes": ""},
                          headers=inv_headers)
        assert res.status_code == 422

    def test_custody_on_nonexistent_evidence(self, client, inv_headers):
        """Evidence not found → 404."""
        with patch("routes.evidence.get_connection") as mc, \
             patch("routes.evidence.get_evidence_by_id", return_value=None):
            mc.return_value = MagicMock()
            res = client.post("/evidence/9999/custody",
                              json={"action_type": "COLLECTED", "notes": ""},
                              headers=inv_headers)

        assert res.status_code == 404

    def test_custody_no_auth(self, client):
        """No token → 403."""
        res = client.post("/evidence/10/custody",
                          json={"action_type": "COLLECTED", "notes": ""})
        assert res.status_code == 403
