# packages/ml-engine/src/routers/users.py
import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.sidecar_auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    SidecarUser,
    build_user_from_row,
    create_access_token,
    decode_access_token,
    extract_bearer_token,
    get_password_hash,
    verify_password,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


async def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
):
    token = extract_bearer_token(request.headers)
    if authorization and not token:
        token = authorization.split(" ", 1)[1].strip() if authorization.lower().startswith("bearer ") else None
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    row = request.app.state.db.query(
        "SELECT email, is_active, is_approved, is_superuser FROM users WHERE email = ?",
        [email],
    )
    if row.empty:
        raise HTTPException(status_code=401, detail="User not found")

    user = build_user_from_row(tuple(row.iloc[0].tolist()))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_active_user(current_user: SidecarUser = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Inactive account")
    if not current_user.is_approved:
        raise HTTPException(status_code=403, detail="Account pending approval")
    return current_user


async def get_current_admin(current_user: SidecarUser = Depends(get_current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user


@router.post("/token")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    db = request.app.state.db
    try:
        df = db.query(
            """
            SELECT email, hashed_password, is_active, is_approved, is_superuser
            FROM users
            WHERE email = ?
            """,
            [form_data.username.strip().lower()],
        )
        if df.empty:
            raise HTTPException(status_code=401, detail="Incorrect email or password")

        user = df.iloc[0].to_dict()
        if not verify_password(form_data.password, user.get("hashed_password")):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Inactive account")
        if not user.get("is_approved", False):
            raise HTTPException(status_code=403, detail="Account pending approval")

        access_token = create_access_token(
            data={"sub": user["email"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Login failed for %s: %s", form_data.username, exc)
        raise HTTPException(status_code=500, detail="Login failed.")


@router.post("/register")
async def register(request: Request, body: RegisterRequest):
    db = request.app.state.db
    try:
        email = body.email.strip().lower()
        existing = db.query("SELECT email FROM users WHERE email = ?", [email])
        if not existing.empty:
            raise HTTPException(status_code=400, detail="User already registered")

        admin_count = db.query("SELECT COUNT(*) AS count FROM users WHERE is_superuser = TRUE")
        bootstrap_admin = int(admin_count.iloc[0]["count"]) == 0

        await db.execute(
            """
            INSERT INTO users (
                email, hashed_password, is_active, is_approved, is_superuser, subscribed_to_news
            ) VALUES (?, ?, TRUE, ?, ?, TRUE)
            """,
            [email, get_password_hash(body.password), bootstrap_admin, bootstrap_admin],
        )
        return {
            "id": email,
            "email": email,
            "is_active": True,
            "is_approved": bootstrap_admin,
            "is_superuser": bootstrap_admin,
            "watchlist": [],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to register user: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to register user.")


@router.post("/logout")
async def logout():
    return {"ok": True}


@router.get("/me")
async def get_me(request: Request, current_user: SidecarUser = Depends(get_current_active_user)):
    db = request.app.state.db
    watchlist_df = db.query(
        "SELECT symbol FROM user_watchlists WHERE user_email = ? ORDER BY added_at ASC",
        [current_user.email],
    )
    return {
        "id": current_user.email,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_approved": current_user.is_approved,
        "is_superuser": current_user.is_superuser,
        "display_name": "Axiom Local Terminal",
        "watchlist": watchlist_df["symbol"].tolist() if not watchlist_df.empty else [],
    }


@router.get("/watchlist")
async def get_watchlist(
    request: Request, current_user: SidecarUser = Depends(get_current_active_user)
):
    db = request.app.state.db
    try:
        df = db.query(
            "SELECT symbol FROM user_watchlists WHERE user_email = ? ORDER BY added_at ASC",
            [current_user.email],
        )
        return df["symbol"].tolist() if not df.empty else []
    except Exception as e:
        logger.error(f"Failed to fetch watchlist: {e}")
        return []


@router.post("/watchlist/{symbol}")
async def add_to_watchlist(
    request: Request,
    symbol: str = Path(..., pattern=r"^[A-Z0-9.-]{1,20}$"),
    current_user: SidecarUser = Depends(get_current_active_user),
):
    db = request.app.state.db
    symbol = symbol.upper()
    try:
        await db.execute(
            "INSERT OR IGNORE INTO user_watchlists (user_email, symbol) VALUES (?, ?)",
            [current_user.email, symbol],
        )
        df = db.query(
            "SELECT symbol FROM user_watchlists WHERE user_email = ? ORDER BY added_at ASC",
            [current_user.email],
        )
        return df["symbol"].tolist() if not df.empty else []
    except Exception as e:
        logger.error(f"Error adding to watchlist: {e}")
        raise HTTPException(status_code=500, detail="Failed to add to watchlist.")


@router.delete("/watchlist/{symbol}")
async def remove_from_watchlist(
    request: Request,
    symbol: str = Path(..., pattern=r"^[A-Z0-9.-]{1,20}$"),
    current_user: SidecarUser = Depends(get_current_active_user),
):
    db = request.app.state.db
    symbol = symbol.upper()
    try:
        await db.execute(
            "DELETE FROM user_watchlists WHERE user_email = ? AND symbol = ?",
            [current_user.email, symbol],
        )
        df = db.query(
            "SELECT symbol FROM user_watchlists WHERE user_email = ? ORDER BY added_at ASC",
            [current_user.email],
        )
        return df["symbol"].tolist() if not df.empty else []
    except Exception as e:
        logger.error(f"Error removing from watchlist: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove from watchlist.")
