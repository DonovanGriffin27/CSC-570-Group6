"""
Authentication Tests
====================
Covers: login, logout, /auth/me, account requests, account approval/denial,
        and department endpoints.

All database calls are mocked so these tests run without a live database.
"""

import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import CASE


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_row():
    """Simulates what get_user_by_email returns for a valid user."""
    from services.auth_service import hash_password
    return {
        "user_id": 1,
        "email": "inv@test.com",
        "first_name": "Test",
        "last_name": "Investigator",
        "password_hash": hash_password("password123"),
        "department_id": 1,
    }


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class TestLogin:
    """POST /auth/login"""

    def test_login_valid_investigator(self, client):
        """Happy path: valid credentials return a token and user payload."""
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.get_user_by_email", return_value=_user_row()), \
             patch("routes.auth.get_user_role", return_value="investigator"), \
             patch("routes.auth.get_admin_level", return_value=None), \
             patch("routes.auth.get_mongo_db", return_value=MagicMock()), \
             patch("routes.auth.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/auth/login",
                              json={"email": "inv@test.com", "password": "password123"})

        assert res.status_code == 200
        body = res.json()
        assert "access_token" in body
        assert body["user"]["role"] == "investigator"
        assert body["user"]["email"] == "inv@test.com"

    def test_login_valid_admin(self, client):
        """Admin login includes admin_level in the response."""
        from services.auth_service import hash_password
        admin_row = {
            "user_id": 2, "email": "admin@test.com",
            "first_name": "Super", "last_name": "Admin",
            "password_hash": hash_password("adminpass"),
            "department_id": 1,
        }
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.get_user_by_email", return_value=admin_row), \
             patch("routes.auth.get_user_role", return_value="admin"), \
             patch("routes.auth.get_admin_level", return_value="SUPER_ADMIN"), \
             patch("routes.auth.get_mongo_db", return_value=MagicMock()), \
             patch("routes.auth.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/auth/login",
                              json={"email": "admin@test.com", "password": "adminpass"})

        assert res.status_code == 200
        assert res.json()["user"]["admin_level"] == "SUPER_ADMIN"

    def test_login_wrong_password(self, client):
        """Wrong password returns 401."""
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.get_user_by_email", return_value=_user_row()):
            mc.return_value = MagicMock()
            res = client.post("/auth/login",
                              json={"email": "inv@test.com", "password": "wrongpass"})

        assert res.status_code == 401

    def test_login_unknown_email(self, client):
        """Email not in database returns 401 (no user-enumeration leak)."""
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.get_user_by_email", return_value=None):
            mc.return_value = MagicMock()
            res = client.post("/auth/login",
                              json={"email": "nobody@test.com", "password": "anything"})

        assert res.status_code == 401

    def test_login_account_no_role(self, client):
        """User exists but has no role assigned returns 403."""
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.get_user_by_email", return_value=_user_row()), \
             patch("routes.auth.get_user_role", return_value=None):
            mc.return_value = MagicMock()
            res = client.post("/auth/login",
                              json={"email": "inv@test.com", "password": "password123"})

        assert res.status_code == 403

    def test_login_missing_body(self, client):
        """Empty body returns 422 Unprocessable Entity."""
        res = client.post("/auth/login", json={})
        assert res.status_code == 422

    def test_login_audit_event_logged(self, client):
        """Successful login must produce a USER_LOGIN audit event."""
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.get_user_by_email", return_value=_user_row()), \
             patch("routes.auth.get_user_role", return_value="investigator"), \
             patch("routes.auth.get_admin_level", return_value=None), \
             patch("routes.auth.get_mongo_db", return_value=MagicMock()), \
             patch("routes.auth.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.post("/auth/login",
                        json={"email": "inv@test.com", "password": "password123"})

        mock_audit.assert_called_once()
        call_args = mock_audit.call_args[0]
        assert call_args[2] == "USER_LOGIN"


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

class TestLogout:
    """POST /auth/logout"""

    def test_logout_success(self, client, inv_headers):
        """Valid token returns 200 and logs USER_LOGOUT."""
        with patch("routes.auth.get_mongo_db", return_value=MagicMock()), \
             patch("routes.auth.log_audit_event") as mock_audit:
            res = client.post("/auth/logout", headers=inv_headers)

        assert res.status_code == 200
        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "USER_LOGOUT"

    def test_logout_no_token(self, client):
        """Request without token returns 403."""
        res = client.post("/auth/logout")
        assert res.status_code == 403

    def test_logout_invalid_token(self, client):
        """Malformed token returns 401 (middleware rejects bad JWT before route runs)."""
        res = client.post("/auth/logout",
                          headers={"Authorization": "Bearer not.a.real.token"})
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# /auth/me
# ---------------------------------------------------------------------------

class TestMe:
    """GET /auth/me"""

    def test_me_returns_user_payload(self, client, inv_headers):
        """Returns the decoded token payload."""
        res = client.get("/auth/me", headers=inv_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["role"] == "investigator"
        assert body["user_id"] == 1

    def test_me_no_token(self, client):
        """No token → 403."""
        res = client.get("/auth/me")
        assert res.status_code == 403


# ---------------------------------------------------------------------------
# Account requests
# ---------------------------------------------------------------------------

class TestAccountRequest:
    """POST /auth/request-account"""

    BASE = {
        "first_name": "Jane",
        "last_name": "Smith",
        "contact_email": "jane@pd.gov",
        "department_id": 1,
        "requested_role": "investigator",
        "badge_number": "B-1234",
        "rank": "Detective",
        "password": "securepass",
    }

    def test_valid_investigator_request(self, client):
        """All required investigator fields → 201 with request_id."""
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.create_account_request", return_value=42), \
             patch("routes.auth.get_mongo_db", return_value=MagicMock()), \
             patch("routes.auth.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/auth/request-account", json=self.BASE)

        assert res.status_code == 201
        assert res.json()["request_id"] == 42

    def test_valid_admin_request(self, client):
        """Admin request with valid admin_level → 201."""
        body = {**self.BASE, "requested_role": "admin",
                "requested_admin_level": "ADMIN",
                "badge_number": None, "rank": None}
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.create_account_request", return_value=43), \
             patch("routes.auth.get_mongo_db", return_value=MagicMock()), \
             patch("routes.auth.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/auth/request-account", json=body)

        assert res.status_code == 201

    def test_investigator_missing_badge(self, client):
        """Investigator request without badge_number → 400."""
        body = {**self.BASE, "badge_number": ""}
        with patch("routes.auth.get_connection") as mc:
            mc.return_value = MagicMock()
            res = client.post("/auth/request-account", json=body)
        assert res.status_code == 400

    def test_investigator_missing_rank(self, client):
        """Investigator request without rank → 400."""
        body = {**self.BASE, "rank": ""}
        with patch("routes.auth.get_connection") as mc:
            mc.return_value = MagicMock()
            res = client.post("/auth/request-account", json=body)
        assert res.status_code == 400

    def test_invalid_role(self, client):
        """Unrecognised requested_role → 400."""
        body = {**self.BASE, "requested_role": "god"}
        res = client.post("/auth/request-account", json=body)
        assert res.status_code == 400

    def test_admin_invalid_level(self, client):
        """Admin request with bad admin_level → 400."""
        body = {**self.BASE, "requested_role": "admin",
                "requested_admin_level": "OVERLORD"}
        res = client.post("/auth/request-account", json=body)
        assert res.status_code == 400

    def test_duplicate_email_returns_409(self, client):
        """Duplicate contact_email raises 409 Conflict."""
        from psycopg2 import errors as pg_errors
        duplicate_exc = Exception("duplicate key value violates unique constraint")
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.create_account_request",
                   side_effect=duplicate_exc):
            mc.return_value = MagicMock()
            res = client.post("/auth/request-account", json=self.BASE)
        assert res.status_code == 409

    def test_account_request_audit_logged(self, client):
        """Account request submission logs ACCOUNT_REQUEST_SUBMITTED."""
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.create_account_request", return_value=44), \
             patch("routes.auth.get_mongo_db", return_value=MagicMock()), \
             patch("routes.auth.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.post("/auth/request-account", json=self.BASE)

        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "ACCOUNT_REQUEST_SUBMITTED"


# ---------------------------------------------------------------------------
# Account review (admin)
# ---------------------------------------------------------------------------

class TestAccountReview:
    """PATCH /admin/account-requests/{id}"""

    def _mock_cursor(self, mc, req_id=1):
        cursor = MagicMock()
        cursor.fetchone.return_value = ("Jane", "Smith", "jane@pd.gov")
        mc.return_value.cursor.return_value.__enter__.return_value = cursor
        mc.return_value.cursor.return_value.__exit__.return_value = False

    def test_approve_request(self, client, admin_headers):
        """SUPER_ADMIN can approve a pending request → 200."""
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.approve_account_request", return_value=99), \
             patch("routes.auth.get_mongo_db", return_value=MagicMock()), \
             patch("routes.auth.log_audit_event"):
            self._mock_cursor(mc)
            res = client.patch("/admin/account-requests/1",
                               json={"action": "approve"},
                               headers=admin_headers)

        assert res.status_code == 200
        assert "approved" in res.json()["message"].lower()

    def test_deny_request(self, client, admin_headers):
        """SUPER_ADMIN can deny a request → 200."""
        with patch("routes.auth.get_connection") as mc, \
             patch("routes.auth.deny_account_request"), \
             patch("routes.auth.get_mongo_db", return_value=MagicMock()), \
             patch("routes.auth.log_audit_event"):
            self._mock_cursor(mc)
            res = client.patch("/admin/account-requests/1",
                               json={"action": "deny"},
                               headers=admin_headers)

        assert res.status_code == 200

    def test_invalid_action(self, client, admin_headers):
        """Invalid action value → 400."""
        res = client.patch("/admin/account-requests/1",
                           json={"action": "maybe"},
                           headers=admin_headers)
        assert res.status_code == 400

    def test_review_requires_admin(self, client, inv_headers):
        """Investigator cannot review requests → 403."""
        res = client.patch("/admin/account-requests/1",
                           json={"action": "approve"},
                           headers=inv_headers)
        assert res.status_code == 403
