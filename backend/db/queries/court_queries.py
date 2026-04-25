# Authored by James Williams
def get_court_dates(conn, case_id: int) -> list:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT court_date_id, case_id, date, court, hearing_type
            FROM court_date
            WHERE case_id = %s
            ORDER BY date ASC
            """,
            (case_id,),
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        result = []
        for row in rows:
            d = dict(zip(cols, row))
            d["date"] = d["date"].isoformat()
            result.append(d)
    return result


def create_court_date(conn, case_id: int, date: str, court: str,
                      hearing_type: str | None) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO court_date (case_id, date, court, hearing_type)
            VALUES (%s, %s, %s, %s)
            RETURNING court_date_id
            """,
            (case_id, date, court, hearing_type or None),
        )
        court_date_id = cur.fetchone()[0]
        conn.commit()
    return court_date_id


def delete_court_date(conn, court_date_id: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM court_date WHERE court_date_id = %s",
            (court_date_id,),
        )
        conn.commit()
