
def create_case(conn, title, priority):
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO cases (title, status, priority)
        VALUES (%s, 'Open', %s)
        RETURNING case_id;
    """, (title, priority))

    case_id = cur.fetchone()[0]

    conn.commit()
    cur.close()

    return case_id

def get_case_by_id(conn, case_id):
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM cases
        WHERE case_id = %s;
    """, (case_id,))

    row = cur.fetchone()
    cur.close()

    if row:
        return {
            "case_id": row[0],
            "title": row[1],
            "status": row[2],
            "priority": row[3],
            "date_opened": row[4].isoformat(),
            "date_closed": row[5].isoformat() if row[5] else None
        }


    return row

def get_all_cases(conn):
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM cases
        ORDER BY date_opened DESC;
    """)

    rows = cur.fetchall()

    cur.close()

    cases = []

    for row in rows:
        cases.append({
            "case_id": row[0],
            "title": row[1],
            "status": row[2],
            "priority": row[3],
            "date_opened": row[4].isoformat(),
            "date_closed": row[5].isoformat() if row[5] else None
        })

    return cases