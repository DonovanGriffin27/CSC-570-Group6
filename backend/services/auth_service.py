import os
from datetime import datetime, timedelta, timezone

import bcrypt
from dotenv import load_dotenv
from jose import jwt

load_dotenv()

#  Password hashing  (bcrypt direct)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

#  JWT  (HS256 via python-jose)

_SECRET = os.getenv("JWT_SECRET", "change_this_before_production")
_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 30


def create_token(user_id: int, email: str, role: str,
                 admin_level: str = None, department_id: int = None,
                 name: str = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expire,
    }
    if admin_level:
        payload["admin_level"] = admin_level
    if department_id is not None:
        payload["department_id"] = department_id
    if name:
        payload["name"] = name
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and validate the token.
    Raises jose.JWTError if invalid or expired.
    Returns the payload dict with keys: sub, email, role, exp.
    """
    return jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
