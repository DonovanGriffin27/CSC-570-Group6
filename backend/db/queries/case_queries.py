def create_case(conn, priority, title=None):
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO cases (status, priority, title)
        VALUES ('Open', %s, %s)
        RETURNING case_id;
    """, (priority, title))

    case_id = cur.fetchone()[0]

    year = __import__('datetime').datetime.now().year
    case_number = f"CR-{year}-{str(case_id).zfill(6)}"

    cur.execute("""
        UPDATE cases SET case_number = %s WHERE case_id = %s;
    """, (case_number, case_id))

    conn.commit()
    cur.close()

    return case_id, case_number

def update_case_details(conn, case_id, title=None, priority=None, status=None):
    cur = conn.cursor()

    cur.execute("""
        UPDATE cases 
        SET 
            title = COALESCE(%s, title),
            priority = COALESCE(%s, priority),
            status = COALESCE(%s, status)
        WHERE case_id = %s;
    """, (title, priority, status, case_id))

    conn.commit()
    cur.close()

def get_case_by_id(conn, case_id):
    cur = conn.cursor()

    cur.execute("""
        SELECT case_id, case_number, title, status, priority, date_opened, date_closed
        FROM cases WHERE case_id = %s;
    """, (case_id,))

    row = cur.fetchone()
    cur.close()

    if row:
        return {
            "case_id": row[0],
            "case_number": row[1],
            "title": row[2],
            "status": row[3],
            "priority": row[4],
            "date_opened": row[5].isoformat(),
            "date_closed": row[6].isoformat() if row[6] else None
        }

    return None

def get_all_cases(conn):
    cur = conn.cursor()

    cur.execute("""
        SELECT case_id, case_number, title, status, priority, date_opened, date_closed
        FROM cases
        ORDER BY date_opened DESC;
    """)

    rows = cur.fetchall()
    cur.close()

    cases = []
    for row in rows:
        cases.append({
            "case_id": row[0],
            "case_number": row[1],
            "title": row[2],
            "status": row[3],
            "priority": row[4],
            "date_opened": row[5].isoformat(),
            "date_closed": row[6].isoformat() if row[6] else None
        })

    return cases


def get_all_cases_overview(conn, department_id=None):
    """All cases with their crime report type and assigned investigator names.
    Pass department_id to scope results to one department (None = all departments)."""
    cur = conn.cursor()
    base = """
        SELECT
            c.case_id,
            c.case_number,
            c.title,
            c.status,
            c.priority,
            c.date_opened,
            cr.report_type,
            COALESCE(
                STRING_AGG(u.first_name || ' ' || u.last_name, ', ' ORDER BY u.last_name),
                'Unassigned'
            ) AS assigned_to
        FROM cases c
        INNER JOIN crime_report cr ON c.case_id = cr.case_id
        JOIN users filing_user ON cr.filed_by_user_id = filing_user.user_id
        LEFT JOIN assignment a ON c.case_id = a.case_id
        LEFT JOIN users u ON a.user_id = u.user_id
    """
    if department_id is not None:
        cur.execute(
            base + "WHERE filing_user.department_id = %s "
                   "GROUP BY c.case_id, c.case_number, c.title, c.status, c.priority, "
                   "c.date_opened, cr.report_type ORDER BY c.date_opened DESC",
            (department_id,),
        )
    else:
        cur.execute(
            base + "GROUP BY c.case_id, c.case_number, c.title, c.status, c.priority, "
                   "c.date_opened, cr.report_type ORDER BY c.date_opened DESC"
        )
    rows = cur.fetchall()
    cur.close()
    return [
        {
            "case_id": r[0],
            "case_number": r[1],
            "title": r[2],
            "status": r[3],
            "priority": r[4],
            "date_opened": r[5].isoformat(),
            "report_type": r[6],
            "assigned_to": r[7],
        }
        for r in rows
    ]