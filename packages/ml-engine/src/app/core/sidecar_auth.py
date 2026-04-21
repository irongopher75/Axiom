import os
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt
from starlette.datastructures import Headers

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "your_secret_key_here":
    SECRET_KEY = secrets.token_urlsafe(32)
    print("WARNING: Insecure or missing SECRET_KEY. Generated a temporary session key.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12


@dataclass
class SidecarUser:
    email: str
    is_active: bool
    is_approved: bool
    is_superuser: bool

    @property
    def id(self) -> str:
        return self.email

    @property
    def watchlist(self) -> list[str]:
        return []


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    if not hashed_password:
        return False
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def extract_bearer_token(headers: Headers) -> str | None:
    auth_header = headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


def extract_ws_token(headers: Headers, query_params: dict[str, Any] | None = None) -> str | None:
    token = extract_bearer_token(headers)
    if token:
        return token

    protocol_header = headers.get("sec-websocket-protocol", "")
    for item in [part.strip() for part in protocol_header.split(",") if part.strip()]:
        if item.startswith("bearer."):
            return item.split(".", 1)[1]

    if query_params:
        return query_params.get("token")

    return None


def build_user_from_row(row: tuple[Any, ...] | None) -> SidecarUser | None:
    if not row:
        return None
    return SidecarUser(
        email=str(row[0]),
        is_active=bool(row[1]),
        is_approved=bool(row[2]),
        is_superuser=bool(row[3]),
    )
