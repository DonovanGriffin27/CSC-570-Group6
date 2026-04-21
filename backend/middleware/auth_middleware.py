from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from services.auth_service import decode_token

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """
    FastAPI dependency — attach to any route that requires a logged-in user.

    Usage:
        @router.get("/protected")
        def protected(user = Depends(get_current_user)):
            return {"hello": user["email"]}

    Returns a dict with keys: user_id (int), email, role.
    Raises 401 if the token is missing, invalid, or expired.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "user_id": int(payload["sub"]),
        "email": payload["email"],
        "role": payload["role"],
    }


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Dependency that also enforces the 'admin' role."""
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user