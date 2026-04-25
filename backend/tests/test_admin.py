"""
Admin Portal Tests
==================
Covers: cases overview, investigator assignment, audit log access,
admin user management, and role-level access controls.

Access hierarchy:
  SUPER_ADMIN > ADMIN > SUPERVISOR/VIEWER > investigator
"""

import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import CASE


OVERVIEW_CASE = {
    "case_id": 1,
    "case_number": "CR-2024-000001",
    "title": "Warehouse Break-In",
    "status": "Open",
    "priority": "Medium",
    "date_opened": "2024-01-15T10:00:00",
    "report_type": "Property Crime",
    "assigned_to": "Test Investigator",
}

AUDIT_EVENT = {
    "_id": "aaa111",
    "user_id": 1,
    "action_type": "USER_LOGIN",
    "description": "Test Investigator signed in",
    "time_stamp": "2024-01-15T08:00:00",
}

INVESTIGATOR_USER = {
    "user_id": 1,
    "first_name": "Test",
    "last_name": "Investigator",
    "email": "inv@test.com",
    "department_id": 1,
}

ADMIN_USER = {
    "user_id": 2,
    "first_name": "Super",
    "last_name": "Admin",
    "email": "admin@test.com",
    "admin_level": "ADMIN",
}


class TestAdminCases:
    """GET /admin/cases"""

    def test_admin_sees_all_cases(self, client, admin_headers):
        """SUPER_ADMIN receives the full cases overview list."""
        with patch("routes.admin.get_connection") as mc, \
             patch("routes.admin.get_all_cases_overview",
                   return_value=[OVERVIEW_CASE]):
            mc.return_value = MagicMock()
            res = client.get("/admin/cases", headers=admin_headers)

        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert data[0]["case_number"] == "CR-2024-000001"

    def test_investigator_cannot_access_admin_cases(self, client, inv_headers):
        """Investigator gets 403 on /admin/cases."""
        res = client.get("/admin/cases", headers=inv_headers)
        assert res.status_code == 403

    def test_no_auth(self, client):
        res = client.get("/admin/cases")
        assert res.status_code == 403

    def test_empty_returns_empty_list(self, client, admin_headers):
        """No cases → empty list."""
        with patch("routes.admin.get_connection") as mc, \
             patch("routes.admin.get_all_cases_overview", return_value=[]):
            mc.return_value = MagicMock()
            res = client.get("/admin/cases", headers=admin_headers)

        assert res.status_code == 200
        assert res.json() == []


class TestAdminInvestigators:
    """GET /admin/investigators"""

    def test_returns_investigator_list(self, client, admin_headers):
        """Returns list of available investigators."""
        with patch("routes.admin.get_connection") as mc, \
             patch("routes.admin.get_all_investigators",
                   return_value=[INVESTIGATOR_USER]):
            mc.return_value = MagicMock()
            res = client.get("/admin/investigators", headers=admin_headers)

        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_investigator_cannot_list_investigators(self, client, inv_headers):
        res = client.get("/admin/investigators", headers=inv_headers)
        assert res.status_code == 403


class TestAdminAssign:
    """POST /admin/cases/{case_id}/assign"""

    def _mock_cursor(self, mc, inv_name=("Test", "Investigator"),
                     case_num=("CR-2024-000001",)):
        cursor = MagicMock()
        cursor.fetchone.side_effect = [inv_name, case_num]
        mc.return_value.cursor.return_value.__enter__.return_value = cursor
        mc.return_value.cursor.return_value.__exit__.return_value = False

    def test_assign_investigator(self, client, admin_headers):
        """Returns assignment_id on successful assignment."""
        with patch("routes.admin.get_connection") as mc, \
             patch("routes.admin.assign_investigator", return_value=1), \
             patch("routes.admin.get_mongo_db", return_value=MagicMock()), \
             patch("routes.admin.add_timeline_event"), \
             patch("routes.admin.log_audit_event"):
            self._mock_cursor(mc)
            res = client.post("/admin/cases/1/assign", json={"user_id": 1},
                              headers=admin_headers)

        assert res.status_code == 200
        assert res.json()["assignment_id"] == 1

    def test_assign_logs_investigator_assigned(self, client, admin_headers):
        """INVESTIGATOR_ASSIGNED audit event is emitted."""
        with patch("routes.admin.get_connection") as mc, \
             patch("routes.admin.assign_investigator", return_value=1), \
             patch("routes.admin.get_mongo_db", return_value=MagicMock()), \
             patch("routes.admin.add_timeline_event"), \
             patch("routes.admin.log_audit_event") as mock_audit:
            self._mock_cursor(mc)
            client.post("/admin/cases/1/assign", json={"user_id": 1},
                        headers=admin_headers)

        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "INVESTIGATOR_ASSIGNED"

    def test_assign_logs_timeline(self, client, admin_headers):
        """Assignment emits a STATUS_CHANGE timeline event."""
        with patch("routes.admin.get_connection") as mc, \
             patch("routes.admin.assign_investigator", return_value=1), \
             patch("routes.admin.get_mongo_db", return_value=MagicMock()), \
             patch("routes.admin.add_timeline_event") as mock_tl, \
             patch("routes.admin.log_audit_event"):
            self._mock_cursor(mc)
            client.post("/admin/cases/1/assign", json={"user_id": 1},
                        headers=admin_headers)

        mock_tl.assert_called_once()
        assert mock_tl.call_args[0][2] == "STATUS_CHANGE"

    def test_viewer_cannot_assign(self, client, viewer_headers):
        """VIEWER admin level cannot assign investigators."""
        res = client.post("/admin/cases/1/assign", json={"user_id": 1},
                          headers=viewer_headers)
        assert res.status_code == 403

    def test_investigator_cannot_assign(self, client, inv_headers):
        res = client.post("/admin/cases/1/assign", json={"user_id": 1},
                          headers=inv_headers)
        assert res.status_code == 403


class TestAuditLog:
    """GET /admin/audit"""

    def test_super_admin_sees_audit_log(self, client, admin_headers):
        """SUPER_ADMIN can read the full audit log."""
        with patch("routes.admin.get_mongo_db", return_value=MagicMock()), \
             patch("routes.admin.get_all_audit_events",
                   return_value=[AUDIT_EVENT]):
            res = client.get("/admin/audit", headers=admin_headers)

        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_viewer_can_read_audit(self, client, viewer_headers):
        """VIEWER admin can read the audit log (require_any_admin)."""
        with patch("routes.admin.get_mongo_db", return_value=MagicMock()), \
             patch("routes.admin.get_all_audit_events", return_value=[]):
            res = client.get("/admin/audit", headers=viewer_headers)

        assert res.status_code == 200

    def test_investigator_cannot_read_audit(self, client, inv_headers):
        """Investigator cannot access audit log."""
        res = client.get("/admin/audit", headers=inv_headers)
        assert res.status_code == 403

    def test_no_auth(self, client):
        res = client.get("/admin/audit")
        assert res.status_code == 403


class TestAdminManagement:
    """GET /admin/admins and PATCH /admin/admins/{user_id}/level"""

    def test_super_admin_lists_admins(self, client, admin_headers):
        """SUPER_ADMIN can list all admin users."""
        with patch("routes.admin.get_connection") as mc, \
             patch("routes.admin.get_all_admins", return_value=[ADMIN_USER]):
            mc.return_value = MagicMock()
            res = client.get("/admin/admins", headers=admin_headers)

        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_op_admin_cannot_list_admins(self, client, op_admin_headers):
        """Regular ADMIN cannot access admin management (SUPER_ADMIN only)."""
        res = client.get("/admin/admins", headers=op_admin_headers)
        assert res.status_code == 403

    def test_investigator_cannot_list_admins(self, client, inv_headers):
        res = client.get("/admin/admins", headers=inv_headers)
        assert res.status_code == 403

    def test_change_admin_level_valid(self, client, admin_headers):
        """SUPER_ADMIN can change another user's admin level."""
        with patch("routes.admin.get_connection") as mc, \
             patch("routes.admin.update_admin_level"), \
             patch("routes.admin.get_mongo_db", return_value=MagicMock()), \
             patch("routes.admin.log_audit_event"):
            mc.return_value = MagicMock()
            # user_id=99 (different from admin token user_id=2)
            res = client.patch("/admin/admins/99/level",
                               json={"admin_level": "SUPERVISOR"},
                               headers=admin_headers)

        assert res.status_code == 200

    def test_cannot_change_own_level(self, client, admin_headers):
        """Admin cannot change their own admin level (self-lock protection)."""
        # admin_token has user_id=2
        with patch("routes.admin.get_connection") as mc:
            mc.return_value = MagicMock()
            res = client.patch("/admin/admins/2/level",
                               json={"admin_level": "VIEWER"},
                               headers=admin_headers)

        assert res.status_code == 400

    def test_change_level_invalid_value(self, client, admin_headers):
        """Invalid admin_level value → 400."""
        res = client.patch("/admin/admins/99/level",
                           json={"admin_level": "DICTATOR"},
                           headers=admin_headers)
        assert res.status_code == 400

    def test_change_level_logs_audit(self, client, admin_headers):
        """ADMIN_LEVEL_CHANGED audit event is emitted."""
        with patch("routes.admin.get_connection") as mc, \
             patch("routes.admin.update_admin_level"), \
             patch("routes.admin.get_mongo_db", return_value=MagicMock()), \
             patch("routes.admin.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.patch("/admin/admins/99/level",
                         json={"admin_level": "ADMIN"},
                         headers=admin_headers)

        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "ADMIN_LEVEL_CHANGED"

    def test_all_valid_admin_levels(self, client, admin_headers):
        """Every defined admin_level passes validation."""
        for level in ("SUPER_ADMIN", "ADMIN", "SUPERVISOR", "VIEWER"):
            with patch("routes.admin.get_connection") as mc, \
                 patch("routes.admin.update_admin_level"), \
                 patch("routes.admin.get_mongo_db", return_value=MagicMock()), \
                 patch("routes.admin.log_audit_event"):
                mc.return_value = MagicMock()
                res = client.patch("/admin/admins/99/level",
                                   json={"admin_level": level},
                                   headers=admin_headers)
            assert res.status_code == 200, f"admin_level '{level}' was rejected"
