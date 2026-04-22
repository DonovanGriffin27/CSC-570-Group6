#  User lookup

def get_user_by_email(conn, email: str):
    """Return the users row for the given email, or None."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT user_id, first_name, last_name, contact_email, password_hash, department_id
            FROM users
            WHERE contact_email = %s
            """,
            (email,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return {
        "user_id": row[0],
        "first_name": row[1],
        "last_name": row[2],
        "email": row[3],
        "password_hash": row[4],
        "department_id": row[5],
    }


def get_user_role(conn, user_id: int) -> str | None:
    """Return 'admin', 'investigator', or None if the user has no role row yet."""
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM admin WHERE user_id = %s", (user_id,))
        if cur.fetchone():
            return "admin"
        cur.execute("SELECT 1 FROM investigator WHERE user_id = %s", (user_id,))
        if cur.fetchone():
            return "investigator"
    return None


def get_admin_level(conn, user_id: int) -> str | None:
    """Return the admin_level enum value for the given user, or None."""
    with conn.cursor() as cur:
        cur.execute("SELECT admin_level FROM admin WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
    return row[0] if row else None


def get_all_investigators(conn, department_id=None) -> list:
    with conn.cursor() as cur:
        if department_id is not None:
            cur.execute("""
                SELECT u.user_id, u.first_name, u.last_name, i.badge_number, i.rank
                FROM users u
                JOIN investigator i ON u.user_id = i.user_id
                WHERE u.department_id = %s
                ORDER BY u.last_name, u.first_name
            """, (department_id,))
        else:
            cur.execute("""
                SELECT u.user_id, u.first_name, u.last_name, i.badge_number, i.rank
                FROM users u
                JOIN investigator i ON u.user_id = i.user_id
                ORDER BY u.last_name, u.first_name
            """)
        rows = cur.fetchall()
    return [
        {"user_id": r[0], "first_name": r[1], "last_name": r[2],
         "badge_number": r[3], "rank": r[4]}
        for r in rows
    ]


def get_all_admins(conn) -> list:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT u.user_id, u.first_name, u.last_name, u.contact_email, a.admin_level
            FROM users u
            JOIN admin a ON u.user_id = a.user_id
            ORDER BY a.admin_level, u.last_name
        """)
        rows = cur.fetchall()
    return [
        {"user_id": r[0], "first_name": r[1], "last_name": r[2],
         "email": r[3], "admin_level": r[4]}
        for r in rows
    ]


def update_admin_level(conn, user_id: int, new_level: str):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE admin SET admin_level = %s WHERE user_id = %s",
            (new_level, user_id),
        )
    conn.commit()

#  Account requests (sign-up flow)

def create_account_request(conn, first_name, last_name, contact_email,
                           contact_phone, department_id, requested_role,
                           badge_number, rank, password_hash,
                           requested_admin_level=None):
    """Insert a new account request; return the new request_id."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO account_request
              (first_name, last_name, contact_email, contact_phone,
               department_id, requested_role, requested_admin_level,
               badge_number, rank, password_hash)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING request_id
            """,
            (first_name, last_name, contact_email, contact_phone,
             department_id, requested_role, requested_admin_level,
             badge_number, rank, password_hash),
        )
        request_id = cur.fetchone()[0]
    conn.commit()
    return request_id


def get_account_requests(conn, status_filter: str | None = None):
    """Return all account requests, optionally filtered by status."""
    with conn.cursor() as cur:
        if status_filter:
            cur.execute(
                """
                SELECT request_id, first_name, last_name, contact_email,
                       contact_phone, department_id, requested_role,
                       requested_admin_level, badge_number, rank, status, requested_at
                FROM account_request
                WHERE status = %s
                ORDER BY requested_at DESC
                """,
                (status_filter,),
            )
        else:
            cur.execute(
                """
                SELECT request_id, first_name, last_name, contact_email,
                       contact_phone, department_id, requested_role,
                       requested_admin_level, badge_number, rank, status, requested_at
                FROM account_request
                ORDER BY requested_at DESC
                """
            )
        rows = cur.fetchall()

    keys = ["request_id", "first_name", "last_name", "contact_email",
            "contact_phone", "department_id", "requested_role",
            "requested_admin_level", "badge_number", "rank", "status", "requested_at"]
    return [dict(zip(keys, r)) for r in rows]


def get_account_request_by_id(conn, request_id: int):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT request_id, first_name, last_name, contact_email,
                   contact_phone, department_id, requested_role,
                   requested_admin_level, badge_number, rank, password_hash, status
            FROM account_request
            WHERE request_id = %s
            """,
            (request_id,),
        )
        row = cur.fetchone()
    if not row:
        return None
    keys = ["request_id", "first_name", "last_name", "contact_email",
            "contact_phone", "department_id", "requested_role",
            "requested_admin_level", "badge_number", "rank", "password_hash", "status"]
    return dict(zip(keys, row))


def approve_account_request(conn, request_id: int, reviewed_by: int):
    """
    1. Pull the request row.
    2. INSERT into users.
    3. INSERT into admin or investigator.
    4. Mark request status = 'Approved'.
    Returns the new user_id.
    """
    req = get_account_request_by_id(conn, request_id)
    if not req:
        raise ValueError(f"Account request {request_id} not found")

    if not req["department_id"]:
        raise ValueError("Cannot approve: request is missing a department_id.")
    if req["requested_role"] == "investigator":
        if not req["badge_number"]:
            raise ValueError("Cannot approve: investigator request is missing badge_number.")
        if not req["rank"]:
            raise ValueError("Cannot approve: investigator request is missing rank.")

    with conn.cursor() as cur:
        # Create the user
        cur.execute(
            """
            INSERT INTO users (first_name, last_name, contact_email, password_hash, department_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING user_id
            """,
            (req["first_name"], req["last_name"], req["contact_email"],
             req["password_hash"], req["department_id"]),
        )
        new_user_id = cur.fetchone()[0]

        # Create the role row
        role = req["requested_role"]
        if role == "admin":
            admin_level = req.get("requested_admin_level") or "ADMIN"
            cur.execute(
                "INSERT INTO admin (user_id, admin_level) VALUES (%s, %s)",
                (new_user_id, admin_level),
            )
        elif role == "investigator":
            cur.execute(
                """
                INSERT INTO investigator (user_id, badge_number, rank)
                VALUES (%s, %s, %s)
                """,
                (new_user_id, req["badge_number"], req["rank"]),
            )

        # Mark the request as approved
        cur.execute(
            """
            UPDATE account_request
            SET status = 'Approved', reviewed_by = %s, reviewed_at = NOW()
            WHERE request_id = %s
            """,
            (reviewed_by, request_id),
        )

    conn.commit()
    return new_user_id


def deny_account_request(conn, request_id: int, reviewed_by: int):
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE account_request
            SET status = 'Denied', reviewed_by = %s, reviewed_at = NOW()
            WHERE request_id = %s
            """,
            (reviewed_by, request_id),
        )
    conn.commit()
