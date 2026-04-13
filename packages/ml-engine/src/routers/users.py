# packages/ml-engine/src/routers/users.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

import logging

from fastapi import APIRouter, Depends, HTTPException, Path, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, EmailStr, Field

router = APIRouter()
logger = logging.getLogger(__name__)

# --- DEFAULT LOCAL CREDENTIALS ---
DEFAULT_USER = "admin@axiom.local"
DEFAULT_PASS = "password"


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Mock login for local sidecar.
    Accepts any credentials during dev, or specific defaults.
    """
    if form_data.username == DEFAULT_USER and form_data.password == DEFAULT_PASS:
        return {"access_token": "local-sovereign-token", "token_type": "bearer"}

    if form_data.username == "admin" and form_data.password == "admin":
        return {"access_token": "local-sovereign-token", "token_type": "bearer"}

    raise HTTPException(status_code=401, detail="Incorrect email or password")


@router.post("/register")
async def register(body: RegisterRequest):
    """Mock register - always success in local mode."""
    return {"id": "local-user", "email": body.email, "is_active": True}


@router.get("/me")
async def get_me():
    """Returns the local user profile."""
    return {
        "id": "local-sovereign",
        "email": DEFAULT_USER,
        "is_active": True,
        "is_approved": True,
        "display_name": "Axiom Local Terminal",
        "watchlist": [],
    }


@router.get("/watchlist")
async def get_watchlist(request: Request):
    db = request.app.state.db
    try:
        df = db.query("SELECT symbol FROM watchlist ORDER BY added_at ASC")
        return df["symbol"].tolist() if not df.empty else []
    except Exception as e:
        logger.error(f"Failed to fetch watchlist: {e}")
        return []


@router.post("/watchlist/{symbol}")
async def add_to_watchlist(
    request: Request,
    symbol: str = Path(..., pattern=r"^[A-Z0-9.-]{1,20}$")
):
    db = request.app.state.db
    symbol = symbol.upper()
    try:
        await db.execute("INSERT OR IGNORE INTO watchlist (symbol) VALUES (?)", [symbol])
        df = db.query("SELECT symbol FROM watchlist ORDER BY added_at ASC")
        return df["symbol"].tolist() if not df.empty else []
    except Exception as e:
        logger.error(f"Error adding to watchlist: {e}")
        raise HTTPException(status_code=500, detail="Failed to add to watchlist.")


@router.delete("/watchlist/{symbol}")
async def remove_from_watchlist(
    request: Request,
    symbol: str = Path(..., pattern=r"^[A-Z0-9.-]{1,20}$")
):
    db = request.app.state.db
    symbol = symbol.upper()
    try:
        await db.execute("DELETE FROM watchlist WHERE symbol = ?", [symbol])
        df = db.query("SELECT symbol FROM watchlist ORDER BY added_at ASC")
        return df["symbol"].tolist() if not df.empty else []
    except Exception as e:
        logger.error(f"Error removing from watchlist: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove from watchlist.")
