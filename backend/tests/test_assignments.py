"""
Assignment Tests
================
Covers: assigning investigators to cases (admin-only), and querying
assignments by case or by investigator.

The /assignments POST endpoint is the legacy assignment route.
/admin/cases/{case_id}/assign is the primary admin UI path (tested in test_admin.py).
"""

import pytest
from unittest.mock import patch, MagicMock


ASSIGNMENT = {
    "assignment_id": 1,
    "case_id": 1,
    "user_id": 1,
}


class TestCreateAssignment:
    """POST /assignments"""

    def _mock_cursor(self, mc):
        cursor = MagicMock()
        cursor.fetchone.side_effect = [
            ("Test", "Investigator"),   # SELECT name FROM users
            ("CR-2024-000001",),        # SELECT case_number FROM cases
        ]
        mc.return_value.cursor.return_value.__enter__.return_value = cursor
        mc.return_value.cursor.return_value.__exit__.return_value = False

    def test_admin_assigns_investigator(self, client, admin_headers):
        """SUPER_ADMIN can create an assignment."""
        with patch("routes.assignments.get_connection") as mc, \
             patch("routes.assignments.assign_investigator", return_value=1), \
             patch("routes.assignments.get_mongo_db", return_value=MagicMock()), \
             patch("routes.assignments.add_timeline_event"), \
             patch("routes.assignments.log_audit_event"):
            self._mock_cursor(mc)
            res = client.post("/assignments",
                              json={"case_id": 1, "user_id": 1},
                              headers=admin_headers)

        assert res.status_code == 200
        assert res.json()["assignment_id"] == 1

    def test_assignment_logs_investigator_assigned(self, client, admin_headers):
        """INVESTIGATOR_ASSIGNED is emitted to audit log."""
        with patch("routes.assignments.get_connection") as mc, \
             patch("routes.assignments.assign_investigator", return_value=1), \
             patch("routes.assignments.get_mongo_db", return_value=MagicMock()), \
             patch("routes.assignments.add_timeline_event"), \
             patch("routes.assignments.log_audit_event") as mock_audit:
            self._mock_cursor(mc)
            client.post("/assignments",
                        json={"case_id": 1, "user_id": 1},
                        headers=admin_headers)

        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "INVESTIGATOR_ASSIGNED"

    def test_assignment_logs_timeline(self, client, admin_headers):
        """STATUS_CHANGE timeline event is emitted on assignment."""
        with patch("routes.assignments.get_connection") as mc, \
             patch("routes.assignments.assign_investigator", return_value=1), \
             patch("routes.assignments.get_mongo_db", return_value=MagicMock()), \
             patch("routes.assignments.add_timeline_event") as mock_tl, \
             patch("routes.assignments.log_audit_event"):
            self._mock_cursor(mc)
            client.post("/assignments",
                        json={"case_id": 1, "user_id": 1},
                        headers=admin_headers)

        mock_tl.assert_called_once()

    def test_investigator_cannot_assign(self, client, inv_headers):
        """Investigator gets 403 on POST /assignments."""
        res = client.post("/assignments",
                          json={"case_id": 1, "user_id": 1},
                          headers=inv_headers)
        assert res.status_code == 403

    def test_viewer_admin_cannot_assign(self, client, viewer_headers):
        """VIEWER admin level gets 403 — requires ADMIN or SUPER_ADMIN."""
        res = client.post("/assignments",
                          json={"case_id": 1, "user_id": 1},
                          headers=viewer_headers)
        assert res.status_code == 403

    def test_missing_case_id(self, client, admin_headers):
        """Missing case_id → 422."""
        res = client.post("/assignments", json={"user_id": 1},
                          headers=admin_headers)
        assert res.status_code == 422

    def test_missing_user_id(self, client, admin_headers):
        """Missing user_id → 422."""
        res = client.post("/assignments", json={"case_id": 1},
                          headers=admin_headers)
        assert res.status_code == 422

    def test_no_auth(self, client):
        res = client.post("/assignments", json={"case_id": 1, "user_id": 1})
        assert res.status_code == 403


class TestGetAssignments:
    """GET /assignments/case/{case_id} and GET /assignments/investigator/{user_id}"""

    def test_get_by_case(self, client, inv_headers):
        """Returns assignments for a given case."""
        assignments = [{"assignment_id": 1, "user_id": 1, "case_id": 1}]
        with patch("routes.assignments.get_connection") as mc, \
             patch("routes.assignments.get_assignments_by_case",
                   return_value=assignments):
            mc.return_value = MagicMock()
            res = client.get("/assignments/case/1", headers=inv_headers)

        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_get_by_case_none_returns_404(self, client, inv_headers):
        """No assignments for a case returns 404 (current backend behaviour)."""
        with patch("routes.assignments.get_connection") as mc, \
             patch("routes.assignments.get_assignments_by_case", return_value=[]):
            mc.return_value = MagicMock()
            res = client.get("/assignments/case/999", headers=inv_headers)

        assert res.status_code == 404

    def test_get_by_investigator(self, client, inv_headers):
        """Returns cases for a given investigator."""
        cases = [{"case_id": 1, "case_number": "CR-2024-000001"}]
        with patch("routes.assignments.get_connection") as mc, \
             patch("routes.assignments.get_cases_by_investigator", return_value=cases):
            mc.return_value = MagicMock()
            res = client.get("/assignments/investigator/1", headers=inv_headers)

        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_get_by_investigator_empty(self, client, inv_headers):
        """No assignments → empty list, not 404."""
        with patch("routes.assignments.get_connection") as mc, \
             patch("routes.assignments.get_cases_by_investigator", return_value=[]):
            mc.return_value = MagicMock()
            res = client.get("/assignments/investigator/99", headers=inv_headers)

        assert res.status_code == 200
        assert res.json() == []
