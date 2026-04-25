"""
Crime Report Tests
==================
Covers: filing a report (which also creates a case), and retrieving reports.
Filing a report is the primary way investigators create cases.
"""

import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import CASE


VALID_REPORT = {
    "title": "Warehouse Break-In on 5th Ave",
    "report_type": "Property Crime",
    "description": "Suspect forced entry through the rear loading dock.",
}


class TestFileCrimeReport:
    """POST /crime-reports"""

    def test_file_report_creates_case(self, client, inv_headers):
        """Valid report returns case_number, case_id, and report_id."""
        with patch("routes.crime_reports.get_connection") as mc, \
             patch("routes.crime_reports.create_case",
                   return_value=(1, "CR-2024-000001")), \
             patch("routes.crime_reports.create_crime_report", return_value=7), \
             patch("routes.crime_reports.get_mongo_db", return_value=MagicMock()), \
             patch("routes.crime_reports.add_timeline_event"), \
             patch("routes.crime_reports.log_audit_event"):
            mc.return_value = MagicMock()
            res = client.post("/crime-reports", json=VALID_REPORT, headers=inv_headers)

        assert res.status_code == 200
        body = res.json()
        assert body["case_number"] == "CR-2024-000001"
        assert body["case_id"] == 1
        assert body["report_id"] == 7

    def test_file_report_logs_audit_and_timeline(self, client, inv_headers):
        """Filing a report emits CRIME_REPORT_FILED to both audit and timeline."""
        with patch("routes.crime_reports.get_connection") as mc, \
             patch("routes.crime_reports.create_case",
                   return_value=(1, "CR-2024-000001")), \
             patch("routes.crime_reports.create_crime_report", return_value=7), \
             patch("routes.crime_reports.get_mongo_db", return_value=MagicMock()), \
             patch("routes.crime_reports.add_timeline_event") as mock_tl, \
             patch("routes.crime_reports.log_audit_event") as mock_audit:
            mc.return_value = MagicMock()
            client.post("/crime-reports", json=VALID_REPORT, headers=inv_headers)

        mock_tl.assert_called_once()
        assert mock_tl.call_args[0][2] == "REPORT_FILED"
        mock_audit.assert_called_once()
        assert mock_audit.call_args[0][2] == "CRIME_REPORT_FILED"

    def test_file_report_missing_title(self, client, inv_headers):
        """Missing title → 422."""
        body = {**VALID_REPORT}
        del body["title"]
        res = client.post("/crime-reports", json=body, headers=inv_headers)
        assert res.status_code == 422

    def test_file_report_missing_description(self, client, inv_headers):
        """Missing description → 422."""
        body = {**VALID_REPORT}
        del body["description"]
        res = client.post("/crime-reports", json=body, headers=inv_headers)
        assert res.status_code == 422

    def test_file_report_invalid_type(self, client, inv_headers):
        """Invalid report_type → 422."""
        body = {**VALID_REPORT, "report_type": "Space Crime"}
        res = client.post("/crime-reports", json=body, headers=inv_headers)
        assert res.status_code == 422

    def test_file_report_no_auth(self, client):
        """No token → 403."""
        res = client.post("/crime-reports", json=VALID_REPORT)
        assert res.status_code == 403

    def test_all_report_types_valid(self, client, inv_headers):
        """Every member of the ReportTypeEnum is accepted."""
        valid_types = [
            "Violent Crime", "Property Crime", "Drug Offense",
            "Fraud / Financial Crime", "Cybercrime",
            "Public Order Offense", "Traffic Offense", "Other",
        ]
        for rtype in valid_types:
            with patch("routes.crime_reports.get_connection") as mc, \
                 patch("routes.crime_reports.create_case",
                       return_value=(1, "CR-2024-000001")), \
                 patch("routes.crime_reports.create_crime_report", return_value=1), \
                 patch("routes.crime_reports.get_mongo_db", return_value=MagicMock()), \
                 patch("routes.crime_reports.add_timeline_event"), \
                 patch("routes.crime_reports.log_audit_event"):
                mc.return_value = MagicMock()
                body = {**VALID_REPORT, "report_type": rtype}
                res = client.post("/crime-reports", json=body, headers=inv_headers)
            assert res.status_code == 200, f"report_type '{rtype}' was rejected"


class TestGetCrimeReports:
    """GET /crime-reports/{case_id}"""

    REPORT_ROW = {
        "report_id": 7,
        "case_id": 1,
        "report_type": "Property Crime",
        "description": "Forced entry.",
        "filed_by_user_id": 1,
    }

    def test_get_reports_success(self, client, inv_headers):
        """Returns list of reports for the case."""
        with patch("routes.crime_reports.get_connection") as mc, \
             patch("routes.crime_reports.get_reports_by_case",
                   return_value=[self.REPORT_ROW]):
            mc.return_value = MagicMock()
            res = client.get("/crime-reports/1", headers=inv_headers)

        assert res.status_code == 200
        assert isinstance(res.json(), list)
        assert res.json()[0]["report_type"] == "Property Crime"

    def test_get_reports_none_returns_404(self, client, inv_headers):
        """No reports for a case returns 404 (current backend behaviour)."""
        with patch("routes.crime_reports.get_connection") as mc, \
             patch("routes.crime_reports.get_reports_by_case", return_value=[]):
            mc.return_value = MagicMock()
            res = client.get("/crime-reports/999", headers=inv_headers)

        assert res.status_code == 404

    def test_get_reports_no_auth(self, client):
        """No token → 403."""
        res = client.get("/crime-reports/1")
        assert res.status_code == 403
