def assign_investigator(conn, case_id, user_id):
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO assignment (case_id, user_id, status)
        VALUES (%s, %s, 'Assigned')
        RETURNING assignment_id;
    """, (case_id, user_id))

    assignment_id = cur.fetchone()[0]

    cur.execute("""
        UPDATE cases SET status = 'In Progress'
        WHERE case_id = %s;
    """, (case_id,))

    conn.commit()
    cur.close()

    return assignment_id

def get_assignments_by_case(conn, case_id):
    cur = conn.cursor()

    cur.execute("""
        SELECT a.assignment_id, a.case_id, a.user_id, a.status, a.assigned_at,
               u.first_name, u.last_name
        FROM assignment a
        JOIN users u ON a.user_id = u.user_id
        WHERE a.case_id = %s;
    """, (case_id,))

    rows = cur.fetchall()
    cur.close()

    assignments = []
    for row in rows:
        assignments.append({
            "assignment_id": row[0],
            "case_id": row[1],
            "user_id": row[2],
            "status": row[3],
            "assigned_at": row[4].isoformat(),
            "first_name": row[5],
            "last_name": row[6]
        })

    return assignments

def get_cases_by_investigator(conn, user_id):
    cur = conn.cursor()

    cur.execute("""
        SELECT c.case_id, c.case_number, c.title, c.status, c.priority, c.date_opened
        FROM cases c
        JOIN assignment a ON c.case_id = a.case_id
        WHERE a.user_id = %s AND c.status = 'In Progress'
        ORDER BY c.date_opened DESC;
    """, (user_id,))

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
            "date_opened": row[5].isoformat()
        })

    return cases