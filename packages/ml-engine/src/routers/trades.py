# packages/ml-engine/src/routers/trades.py
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from app.core.sidecar_auth import SidecarUser
from routers.users import get_current_active_user

router = APIRouter()
logger = logging.getLogger(__name__)


class TradeExecuteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symbol: str = Field(..., pattern=r"^[A-Z0-9.-]{1,20}$")
    side: str = Field(..., pattern=r"^(BUY|SELL)$")
    price: float = Field(..., gt=0)
    quantity: float = Field(..., gt=0)
    strategy: str = Field("MANUAL", max_length=20)


@router.get("/active")
async def get_active_trades(
    request: Request, current_user: SidecarUser = Depends(get_current_active_user)
):
    db = request.app.state.db
    try:
        df = db.query(
            "SELECT * FROM trades WHERE status = 'OPEN' AND user_email = ?",
            [current_user.email],
        )
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"Error fetching active trades: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch active trades.")


@router.get("/history")
async def get_trade_history(
    request: Request, current_user: SidecarUser = Depends(get_current_active_user)
):
    db = request.app.state.db
    try:
        df = db.query(
            "SELECT * FROM trades WHERE status = 'CLOSED' AND user_email = ? ORDER BY exit_timestamp DESC",
            [current_user.email],
        )
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"Error fetching trade history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch trade history.")


@router.get("/performance")
async def get_performance(
    request: Request, current_user: SidecarUser = Depends(get_current_active_user)
):
    db = request.app.state.db
    try:
        closed_df = db.query(
            "SELECT COALESCE(SUM(pnl), 0) AS realized_pnl, COUNT(*) AS total_trades FROM trades WHERE status = 'CLOSED' AND user_email = ?",
            [current_user.email],
        )
        open_df = db.query(
            "SELECT COALESCE(SUM(quantity * entry_price), 0) AS active_exposure, COUNT(*) AS active_units FROM trades WHERE status = 'OPEN' AND user_email = ?",
            [current_user.email],
        )
        realized_pnl = float(closed_df.iloc[0]["realized_pnl"]) if not closed_df.empty else 0.0
        active_exposure = float(open_df.iloc[0]["active_exposure"]) if not open_df.empty else 0.0
        active_units = int(open_df.iloc[0]["active_units"]) if not open_df.empty else 0
        initial_balance = 100000
        total_equity = initial_balance + realized_pnl
        return {
            "initial_balance": initial_balance,
            "realized_pnl": realized_pnl,
            "unrealized_pnl": 0.0,
            "total_pnl": realized_pnl,
            "total_equity": total_equity,
            "active_exposure": active_exposure,
            "active_units": active_units,
            "win_rate": "0%",
            "total_trades": int(closed_df.iloc[0]["total_trades"]) if not closed_df.empty else 0,
            "currency": "$",
        }
    except Exception as e:
        logger.error(f"Error fetching performance: {e}")
        return {"error": "Failed to calculate performance"}


@router.post("/execute")
async def execute_trade(
    request: Request,
    body: TradeExecuteRequest,
    current_user: SidecarUser = Depends(get_current_active_user),
):
    db = request.app.state.db
    trade_id = str(uuid.uuid4())

    try:
        sql = """
            INSERT INTO trades (id, symbol, side, entry_price, quantity, status, strategy, user_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        await db.execute(
            sql,
            [
                trade_id,
                body.symbol.upper(),
                body.side,
                body.price,
                body.quantity,
                "OPEN",
                body.strategy,
                current_user.email,
            ],
        )

        # Return the created trade
        df = db.query("SELECT * FROM trades WHERE id = ? AND user_email = ?", [trade_id, current_user.email])
        if df.empty:
             raise HTTPException(status_code=500, detail="Trade execution confirmation failed.")
        return df.iloc[0].to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing trade for {body.symbol}: {e}")
        raise HTTPException(status_code=500, detail="Trade execution failed.")


@router.post("/close/{trade_id}")
async def close_trade(
    request: Request, trade_id: str, current_user: SidecarUser = Depends(get_current_active_user)
):
    db = request.app.state.db
    try:
        await db.execute(
            """
            UPDATE trades 
            SET status = 'CLOSED', exit_timestamp = ?, exit_price = entry_price * 1.02, pnl = quantity * entry_price * 0.02
            WHERE id = ? AND user_email = ?
        """,
            [datetime.now(), trade_id, current_user.email],
        )
        return {"id": trade_id, "status": "CLOSED"}
    except Exception as e:
        logger.error(f"Error closing trade {trade_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to close trade.")


@router.get("/config")
async def get_trade_config():
    """Returns local risk management and trade settings."""
    return {
        "max_risk_per_trade": 0.02,
        "default_leverage": 1,
        "broker_connected": False,
        "local_mode": True,
        "default_strategy": "MANUAL",
    }
