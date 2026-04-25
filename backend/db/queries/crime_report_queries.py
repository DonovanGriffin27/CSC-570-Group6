# Authored by James Williams
def create_crime_report(conn, case_id, filed_by_user_id, report_type, description):
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO crime_report (case_id, filed_by_user_id, report_type, description)
        VALUES (%s, %s, %s, %s)
        RETURNING report_id;
    """, (case_id, filed_by_user_id, report_type, description))

    report_id = cur.fetchone()[0]
    conn.commit()
    cur.close()

    return report_id

def get_reports_by_case(conn, case_id):
    cur = conn.cursor()

    cur.execute("""
        SELECT report_id, case_id, filed_by_user_id, report_type, report_date, description
        FROM crime_report
        WHERE case_id = %s
        ORDER BY report_date DESC;
    """, (case_id,))

    rows = cur.fetchall()
    cur.close()

    reports = []
    for row in rows:
        reports.append({
            "report_id": row[0],
            "case_id": row[1],
            "filed_by_user_id": row[2],
            "report_type": row[3],
            "report_date": row[4].isoformat(),
            "description": row[5]
        })

    return reports