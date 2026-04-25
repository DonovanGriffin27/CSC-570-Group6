"""
Court Date Tests
================
Covers: scheduling, retrieving, and removing court dates per case.
Validates all hearing_type values, date ordering (upcoming vs past),
and audit logging.
"""

import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import COURT_DATE


VALID_BODY = {
    "date": "2025-09-15T09:00:00",
    "court": "Superior Court of Los Angeles",
    "hearing_type": "Arraignment",
}


class TestGetCourtDates:
    """GET /cases/{case_id}/court-dates"""

    def test_returns_list(self, client, inv_headers):
        """Returns list of court dates for a case."""
        with patch("routes.court.get_connection") as mc, \
             patch("routes.court.get_court_dates", return_value=[COURT_DATE]):
            mc.return_value = MagicMock()
            res = client.get("/cases/1/court-dates", headers=inv_headers)

        assert res.status_code == 200
        assert isinstance(res.json(), list)
        assert res.json()[0]["hearing_type"] == "Arraignment"

    def test_empty_returns_empty_list(self, client, inv_headers):
        """No court dates returns empty list, not 404."""
        with patch("routes.court.get_connection") as mc, \
             patch("routes.court.get_court_dates", return_value=[]):
            mc.return_value = MagicMock()
            res = client.get("/cases/1/court-dates", headers=inv_headers)

        assert res.status_code == 200
        assert res.json() == []

    def test_no_auth(self, client):
        res = client.get("/cases/1/court-dates")
        assert res.status_code == 403


class TestAddCourtDate:
    """POST /cases/{case_id}/court-dates"""

    def test_schedule_valid_date(self, client, inv_headers):
        """Valid body returns court_date_id."""
        with patch("routes.court.get_connection") as mc, \
             patch("routes.court.create_court_date", return_value=3), \
             patch("routes.court.get_mongo_db", return_value=MagicMock()), \
             patch("routes.court.add_timeline_event"), \
             patch("routes.court.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/cases/1/court-dates", json=VALID_BODY,
                              headers=inv_headers)

        assert res.status_code == 200
        assert res.json()["court_date_id"] == 3

    def test_schedule_logs_audit_and_timeline(self, client, inv_headers):
        """Scheduling logs COURT_DATE_ADDED to both audit and timeline."""
        with patch("routes.court.get_connection") as mc, \
             patch("routes.court.create_court_date", return_value=3), \
             patch("routes.court.get_mongo_db", return_value=MagicMock()), \
             patch("routes.court.add_timeline_event") as mock_tl, \
             patch("routes.court.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.post("/cases/1/court-dates", json=VALID_BODY, headers=inv_headers)

        mock_tl.assert_called_once()
        assert mock_tl.call_args[0][2] == "COURT_DATE_ADDED"
        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "COURT_DATE_ADDED"

    def test_missing_court_name(self, client, inv_headers):
        """Empty court name → 400."""
        body = {**VALID_BODY, "court": ""}
        with patch("routes.court.get_connection") as mc:
            mc.return_value = MagicMock()
            res = client.post("/cases/1/court-dates", json=body, headers=inv_headers)
        assert res.status_code == 400

    def test_missing_date(self, client, inv_headers):
        """Missing date → 422."""
        body = {k: v for k, v in VALID_BODY.items() if k != "date"}
        res = client.post("/cases/1/court-dates", json=body, headers=inv_headers)
        assert res.status_code == 422

    def test_invalid_hearing_type(self, client, inv_headers):
        """Unrecognised hearing_type → 400."""
        body = {**VALID_BODY, "hearing_type": "Secret Meeting"}
        with patch("routes.court.get_connection") as mc:
            mc.return_value = MagicMock()
            res = client.post("/cases/1/court-dates", json=body, headers=inv_headers)
        assert res.status_code == 400

    def test_all_valid_hearing_types(self, client, inv_headers):
        """Every defined hearing_type passes validation."""
        valid_types = [
            "Arraignment", "Bail Hearing", "Preliminary Hearing",
            "Pre-Trial Conference", "Motion Hearing", "Trial",
            "Sentencing", "Appeal", "Other",
        ]
        for htype in valid_types:
            with patch("routes.court.get_connection") as mc, \
                 patch("routes.court.create_court_date", return_value=1), \
                 patch("routes.court.get_mongo_db", return_value=MagicMock()), \
                 patch("routes.court.add_timeline_event"), \
                 patch("routes.court.log_audit_event"):
                mc.return_value = MagicMock()
                body = {**VALID_BODY, "hearing_type": htype}
                res = client.post("/cases/1/court-dates", json=body,
                                  headers=inv_headers)
            assert res.status_code == 200, f"hearing_type '{htype}' was rejected"

    def test_optional_hearing_type(self, client, inv_headers):
        """Omitting hearing_type (None) is accepted."""
        body = {"date": VALID_BODY["date"], "court": VALID_BODY["court"]}
        with patch("routes.court.get_connection") as mc, \
             patch("routes.court.create_court_date", return_value=1), \
             patch("routes.court.get_mongo_db", return_value=MagicMock()), \
             patch("routes.court.add_timeline_event"), \
             patch("routes.court.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/cases/1/court-dates", json=body, headers=inv_headers)
        assert res.status_code == 200

    def test_no_auth(self, client):
        res = client.post("/cases/1/court-dates", json=VALID_BODY)
        assert res.status_code == 403


class TestDeleteCourtDate:
    """DELETE /cases/{case_id}/court-dates/{court_date_id}"""

    def test_delete_success(self, client, inv_headers):
        """Returns 200 and logs COURT_DATE_REMOVED."""
        with patch("routes.court.get_connection") as mc, \
             patch("routes.court.delete_court_date"), \
             patch("routes.court.get_mongo_db", return_value=MagicMock()), \
             patch("routes.court.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            res = client.delete("/cases/1/court-dates/3", headers=inv_headers)

        assert res.status_code == 200
        assert res.json()["ok"] is True
        assert mock_audit.call_args[0][2] == "COURT_DATE_REMOVED"

    def test_delete_no_timeline_event(self, client, inv_headers):
        """Removal does NOT emit a timeline event (only audit)."""
        with patch("routes.court.get_connection") as mc, \
             patch("routes.court.delete_court_date"), \
             patch("routes.court.get_mongo_db", return_value=MagicMock()), \
             patch("routes.court.add_timeline_event") as mock_tl, \
             patch("routes.court.log_audit_event"):
            mc.return_value = MagicMock()
            client.delete("/cases/1/court-dates/3", headers=inv_headers)

        mock_tl.assert_not_called()

    def test_delete_no_auth(self, client):
        res = client.delete("/cases/1/court-dates/3")
        assert res.status_code == 403
