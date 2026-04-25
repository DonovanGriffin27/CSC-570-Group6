# Authored by James Williams
def create_custody_event(conn, evidence_id: int, from_user_id: int | None,
                         to_user_id: int | None, action_type: str,
                         location: str | None = None,
                         condition_status: str | None = None,
                         notes: str | None = None) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO custody_event
              (evidence_id, from_user_id, to_user_id, action_type,
               location, condition_status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING custody_event_id
            """,
            (evidence_id, from_user_id, to_user_id, action_type,
             location, condition_status, notes),
        )
        custody_event_id = cur.fetchone()[0]
        conn.commit()
        return custody_event_id


def get_custody_chain(conn, evidence_id: int) -> list:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT ce.custody_event_id, ce.evidence_id, ce.from_user_id,
                   ce.to_user_id, ce.action_type, ce.time_stamp,
                   ce.location, ce.condition_status, ce.notes,
                   fu.first_name AS from_first, fu.last_name AS from_last,
                   tu.first_name AS to_first, tu.last_name AS to_last
            FROM custody_event ce
            LEFT JOIN users fu ON ce.from_user_id = fu.user_id
            LEFT JOIN users tu ON ce.to_user_id = tu.user_id
            WHERE ce.evidence_id = %s
            ORDER BY ce.time_stamp ASC
            """,
            (evidence_id,),
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        result = []
        for row in rows:
            d = dict(zip(cols, row))
            if d.get("time_stamp"):
                d["time_stamp"] = d["time_stamp"].isoformat()
            ff = d.pop("from_first", "") or ""
            fl = d.pop("from_last", "") or ""
            tf = d.pop("to_first", "") or ""
            tl = d.pop("to_last", "") or ""
            d["from_user_name"] = f"{ff} {fl}".strip() or None
            d["to_user_name"] = f"{tf} {tl}".strip() or None
            result.append(d)
        return result
