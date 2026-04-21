from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from db.connection import get_connection
from db.queries.user_queries import (
    get_user_by_email,
    get_user_role,
    create_account_request,
    get_account_requests,
    approve_account_request,
    deny_account_request,
)
from services.auth_service import hash_password, verify_password, create_token
from middleware.auth_middleware import get_current_user, require_admin

router = APIRouter()


# Pydantic model

class LoginRequest(BaseModel):
    email: str
    password: str


class AccountRequestCreate(BaseModel):
    first_name: str
    last_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    department_id: int                   # required — users table is NOT NULL
    requested_role: str                  # "investigator" or "admin"
    badge_number: Optional[str] = None   # required for investigators (validated in route)
    rank: Optional[str] = None           # required for investigators (validated in route)
    password: str                        # plain-text; hashed before storage


class ReviewDecision(BaseModel):
    action: str                  # "approve" or "deny"


# Login

@router.post("/auth/login")
def login(body: LoginRequest):
    conn = get_connection()
    try:
        user = get_user_by_email(conn, body.email)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid email or password")

        if not user["password_hash"] or not verify_password(body.password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid email or password")

        role = get_user_role(conn, user["user_id"])
        if not role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Account exists but has no assigned role. Contact an admin.")

        token = create_token(user["user_id"], user["email"], role)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": user["user_id"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "email": user["email"],
                "role": role,
            },
        }
    finally:
        conn.close()


# Account request  (public — no auth needed)

@router.get("/departments")
def list_departments():
    """Public endpoint — used by the sign-up form to populate the department dropdown."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT department_id, name, department_type FROM department ORDER BY name"
            )
            rows = cur.fetchall()
        return [{"department_id": r[0], "name": r[1], "department_type": r[2]} for r in rows]
    finally:
        conn.close()


class DepartmentCreate(BaseModel):
    name: str
    department_type: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


@router.post("/departments", status_code=201)
def create_department(body: DepartmentCreate, admin=Depends(require_admin)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO department (name, department_type, contact_email, contact_phone)
                VALUES (%s, %s, %s, %s)
                RETURNING department_id
                """,
                (body.name, body.department_type, body.contact_email, body.contact_phone),
            )
            dept_id = cur.fetchone()[0]
        conn.commit()
        return {"department_id": dept_id, "name": body.name}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/auth/request-account", status_code=201)
def request_account(body: AccountRequestCreate):
    if body.requested_role not in ("investigator", "admin"):
        raise HTTPException(status_code=400, detail="requested_role must be 'investigator' or 'admin'")

    if body.requested_role == "investigator":
        if not body.badge_number or not body.badge_number.strip():
            raise HTTPException(status_code=400, detail="Badge number is required for investigators.")
        if not body.rank or not body.rank.strip():
            raise HTTPException(status_code=400, detail="Rank is required for investigators.")

    conn = get_connection()
    try:
        pw_hash = hash_password(body.password)
        request_id = create_account_request(
            conn,
            first_name=body.first_name,
            last_name=body.last_name,
            contact_email=body.contact_email,
            contact_phone=body.contact_phone,
            department_id=body.department_id,
            requested_role=body.requested_role,
            badge_number=body.badge_number,
            rank=body.rank,
            password_hash=pw_hash,
        )
        return {"message": "Account request submitted. An admin will review it shortly.",
                "request_id": request_id}
    except Exception as e:
        conn.rollback()
        # Duplicate email gives a clear error
        if "unique" in str(e).lower():
            raise HTTPException(status_code=409,
                                detail="An account request with that email already exists.")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()



# Admin: review account requests

@router.get("/admin/account-requests")
def list_account_requests(
    status_filter: Optional[str] = None,
    admin=Depends(require_admin),
):
    conn = get_connection()
    try:
        return get_account_requests(conn, status_filter)
    finally:
        conn.close()


@router.patch("/admin/account-requests/{request_id}")
def review_account_request(
    request_id: int,
    body: ReviewDecision,
    admin=Depends(require_admin),
):
    if body.action not in ("approve", "deny"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'deny'")

    conn = get_connection()
    try:
        if body.action == "approve":
            new_user_id = approve_account_request(conn, request_id, admin["user_id"])
            return {"message": "Account approved.", "user_id": new_user_id}
        else:
            deny_account_request(conn, request_id, admin["user_id"])
            return {"message": "Account request denied."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# Current user info  (token refresh / me)

@router.get("/auth/me")
def me(user=Depends(get_current_user)):
    return user
