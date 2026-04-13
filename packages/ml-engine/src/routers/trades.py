# packages/ml-engine/src/routers/trades.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

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
async def get_active_trades(request: Request):
    db = request.app.state.db
    try:
        df = db.query("SELECT * FROM trades WHERE status = 'OPEN'")
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"Error fetching active trades: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch active trades.")


@router.get("/history")
async def get_trade_history(request: Request):
    db = request.app.state.db
    try:
        df = db.query("SELECT * FROM trades WHERE status = 'CLOSED' ORDER BY exit_timestamp DESC")
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"Error fetching trade history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch trade history.")


@router.get("/performance")
async def get_performance(request: Request):
    db = request.app.state.db
    try:
        # Mock performance matching original structure
        return {
            "initial_balance": 100000,
            "total_pnl": 0.0,
            "total_equity": 100000,
            "win_rate": "0%",
            "total_trades": 0,
            "currency": "$",
        }
    except Exception as e:
        logger.error(f"Error fetching performance: {e}")
        return {"error": "Failed to calculate performance"}


@router.post("/execute")
async def execute_trade(request: Request, body: TradeExecuteRequest):
    db = request.app.state.db
    trade_id = str(uuid.uuid4())

    try:
        sql = """
            INSERT INTO trades (id, symbol, side, entry_price, quantity, status, strategy)
            VALUES (?, ?, ?, ?, ?, ?, ?)
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
            ],
        )

        # Return the created trade
        df = db.query("SELECT * FROM trades WHERE id = ?", [trade_id])
        if df.empty:
             raise HTTPException(status_code=500, detail="Trade execution confirmation failed.")
        return df.iloc[0].to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing trade for {body.symbol}: {e}")
        raise HTTPException(status_code=500, detail="Trade execution failed.")


@router.post("/close/{trade_id}")
async def close_trade(request: Request, trade_id: str):
    db = request.app.state.db
    try:
        await db.execute(
            """
            UPDATE trades 
            SET status = 'CLOSED', exit_timestamp = ?, exit_price = entry_price * 1.02, pnl = quantity * entry_price * 0.02
            WHERE id = ?
        """,
            [datetime.now(), trade_id],
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
