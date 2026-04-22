from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from services.auth_service import decode_token

_bearer = HTTPBearer()

# Operational admin levels (can approve users, assign cases, edit cases)
_OP_ADMIN_LEVELS = {"SUPER_ADMIN", "ADMIN"}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = {
        "user_id": int(payload["sub"]),
        "email": payload["email"],
        "role": payload["role"],
    }
    if "admin_level" in payload:
        user["admin_level"] = payload["admin_level"]
    if "department_id" in payload:
        user["department_id"] = payload["department_id"]
    if "name" in payload:
        user["name"] = payload["name"]
    return user


def require_any_admin(user: dict = Depends(get_current_user)) -> dict:
    """Any admin role — including SUPERVISOR and VIEWER (read-only levels)."""
    if user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Admin access required")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Operational admin: ADMIN or SUPER_ADMIN.
    Can approve accounts, assign investigators, edit cases."""
    if user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Admin access required")
    if user.get("admin_level") not in _OP_ADMIN_LEVELS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Operational admin access required (ADMIN or SUPER_ADMIN)")
    return user


def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    """SUPER_ADMIN only — manage admin accounts and levels."""
    if user["role"] != "admin" or user.get("admin_level") != "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Super admin access required")
    return user
