from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db.connection import get_connection
from db.queries.case_queries import create_case
from db.queries.crime_report_queries import create_crime_report, get_reports_by_case
from middleware.auth_middleware import get_current_user
from enum import Enum

router = APIRouter()

class ReportTypeEnum(str, Enum):
    Violent = "Violent Crime"
    Property = "Property Crime"
    Drug = "Drug Offense"
    Fraud = "Fraud / Financial Crime"
    Cyber = "Cybercrime"
    PublicOrder = "Public Order Offense"
    Traffic = "Traffic Offense"
    Other = "Other"

class CrimeReportCreate(BaseModel):
    title: str
    report_type: ReportTypeEnum
    description: str

@router.post("/crime-reports")
def file_crime_report(report: CrimeReportCreate, current_user=Depends(get_current_user)):
    conn = get_connection()

    try:
        case_id, case_number = create_case(conn, "Low", title=report.title)
        report_id = create_crime_report(conn, case_id, current_user["user_id"], report.report_type, report.description)
        return {
            "case_id": case_id,
            "case_number": case_number,
            "report_id": report_id
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/crime-reports/{case_id}")
def get_case_reports(case_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()
    reports = get_reports_by_case(conn, case_id)
    conn.close()

    if not reports:
        raise HTTPException(status_code=404, detail="No reports found for this case")

    return reports