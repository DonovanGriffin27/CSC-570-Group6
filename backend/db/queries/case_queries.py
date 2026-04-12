def create_case(conn, priority):
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO cases (status, priority)
        VALUES ('Open', %s)
        RETURNING case_id;
    """, (priority,))

    case_id = cur.fetchone()[0]

    year = __import__('datetime').datetime.now().year
    case_number = f"CASE-{year}-{str(case_id).zfill(4)}"

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