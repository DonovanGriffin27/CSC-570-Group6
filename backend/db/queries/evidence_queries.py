# Authored by James Williams
def create_evidence(conn, case_id: int, evidence_type: str, description: str,
                    current_status: str, collected_by_user_id: int,
                    collection_location: str | None, condition_status: str) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO evidence
              (case_id, evidence_type, description, current_status,
               collected_by_user_id, collection_location, condition_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING evidence_id, intake_date
            """,
            (case_id, evidence_type, description, current_status,
             collected_by_user_id, collection_location, condition_status),
        )
        row = cur.fetchone()
        conn.commit()
        return {"evidence_id": row[0], "intake_date": row[1].isoformat()}


def get_evidence_by_case(conn, case_id: int) -> list:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT e.evidence_id, e.case_id, e.evidence_type, e.description,
                   e.intake_date, e.current_status, e.collected_by_user_id,
                   e.collection_location, e.condition_status,
                   u.first_name, u.last_name
            FROM evidence e
            LEFT JOIN users u ON e.collected_by_user_id = u.user_id
            WHERE e.case_id = %s
            ORDER BY e.intake_date DESC
            """,
            (case_id,),
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        result = []
        for row in rows:
            d = dict(zip(cols, row))
            if d.get("intake_date"):
                d["intake_date"] = d["intake_date"].isoformat()
            first = d.pop("first_name", "") or ""
            last = d.pop("last_name", "") or ""
            d["collected_by_name"] = f"{first} {last}".strip() or None
            result.append(d)
        return result


def update_evidence_status(conn, evidence_id: int, new_status: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE evidence SET current_status = %s WHERE evidence_id = %s",
            (new_status, evidence_id),
        )
        conn.commit()


def get_all_evidence(conn, role: str, admin_level: str | None,
                     user_id: int, department_id: int | None) -> list:
    base = """
        SELECT e.evidence_id, e.case_id, e.evidence_type, e.description,
               e.intake_date, e.current_status, e.collected_by_user_id,
               e.collection_location, e.condition_status,
               u.first_name, u.last_name,
               c.case_number, c.title AS case_title
        FROM evidence e
        LEFT JOIN users u ON e.collected_by_user_id = u.user_id
        LEFT JOIN cases c ON e.case_id = c.case_id
    """
    if role == "investigator":
        sql = (base
               + " JOIN assignment a ON e.case_id = a.case_id"
               + " WHERE a.user_id = %s ORDER BY e.intake_date DESC")
        params = (user_id,)
    elif admin_level == "SUPER_ADMIN":
        sql = base + " ORDER BY e.intake_date DESC"
        params = ()
    elif department_id:
        sql = base + " WHERE c.department_id = %s ORDER BY e.intake_date DESC"
        params = (department_id,)
    else:
        sql = base + " ORDER BY e.intake_date DESC"
        params = ()

    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        result = []
        for row in rows:
            d = dict(zip(cols, row))
            if d.get("intake_date"):
                d["intake_date"] = d["intake_date"].isoformat()
            first = d.pop("first_name", "") or ""
            last  = d.pop("last_name",  "") or ""
            d["collected_by_name"] = f"{first} {last}".strip() or None
            result.append(d)
        return result


def get_evidence_by_id(conn, evidence_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT e.evidence_id, e.case_id, e.evidence_type, e.description,
                   e.intake_date, e.current_status, e.collected_by_user_id,
                   e.collection_location, e.condition_status,
                   u.first_name, u.last_name
            FROM evidence e
            LEFT JOIN users u ON e.collected_by_user_id = u.user_id
            WHERE e.evidence_id = %s
            """,
            (evidence_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cur.description]
        d = dict(zip(cols, row))
        if d.get("intake_date"):
            d["intake_date"] = d["intake_date"].isoformat()
        first = d.pop("first_name", "") or ""
        last = d.pop("last_name", "") or ""
        d["collected_by_name"] = f"{first} {last}".strip() or None
        return d
