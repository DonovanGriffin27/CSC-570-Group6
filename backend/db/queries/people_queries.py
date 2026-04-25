# Authored by James Williams
def get_case_people(conn, case_id: int) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.person_id, p.first_name, p.last_name, p.dob, p.contact_phone,
                   cs.status, cs.risk_level
            FROM case_suspect cs
            JOIN person p ON cs.person_id = p.person_id
            WHERE cs.case_id = %s
            ORDER BY p.last_name, p.first_name
            """,
            (case_id,),
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        suspects = []
        for row in rows:
            d = dict(zip(cols, row))
            if d.get("dob"):
                d["dob"] = d["dob"].isoformat()
            suspects.append(d)

        cur.execute(
            """
            SELECT p.person_id, p.first_name, p.last_name, p.dob, p.contact_phone
            FROM case_victim cv
            JOIN person p ON cv.person_id = p.person_id
            WHERE cv.case_id = %s
            ORDER BY p.last_name, p.first_name
            """,
            (case_id,),
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        victims = []
        for row in rows:
            d = dict(zip(cols, row))
            if d.get("dob"):
                d["dob"] = d["dob"].isoformat()
            victims.append(d)

    return {"suspects": suspects, "victims": victims}


def create_person(conn, first_name: str, last_name: str,
                  dob=None, contact_phone=None) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO person (first_name, last_name, dob, contact_phone)
            VALUES (%s, %s, %s, %s)
            RETURNING person_id
            """,
            (first_name, last_name, dob or None, contact_phone or None),
        )
        person_id = cur.fetchone()[0]
        conn.commit()
        return person_id


def add_suspect(conn, case_id: int, person_id: int,
                status: str, risk_level: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO case_suspect (person_id, case_id, status, risk_level)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (person_id, case_id) DO NOTHING
            """,
            (person_id, case_id, status, risk_level),
        )
        conn.commit()


def add_victim(conn, case_id: int, person_id: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO case_victim (case_id, person_id)
            VALUES (%s, %s)
            ON CONFLICT (case_id, person_id) DO NOTHING
            """,
            (case_id, person_id),
        )
        conn.commit()


def remove_suspect(conn, case_id: int, person_id: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM case_suspect WHERE case_id = %s AND person_id = %s",
            (case_id, person_id),
        )
        conn.commit()


def remove_victim(conn, case_id: int, person_id: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM case_victim WHERE case_id = %s AND person_id = %s",
            (case_id, person_id),
        )
        conn.commit()


def update_suspect(conn, case_id: int, person_id: int,
                   status: str | None, risk_level: str | None) -> None:
    with conn.cursor() as cur:
        if status is not None:
            cur.execute(
                "UPDATE case_suspect SET status = %s WHERE case_id = %s AND person_id = %s",
                (status, case_id, person_id),
            )
        if risk_level is not None:
            cur.execute(
                "UPDATE case_suspect SET risk_level = %s WHERE case_id = %s AND person_id = %s",
                (risk_level, case_id, person_id),
            )
        conn.commit()
