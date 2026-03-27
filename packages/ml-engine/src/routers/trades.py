# packages/ml-engine/src/routers/trades.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
import uuid
import logging
from datetime import datetime
import pandas as pd

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/active")
async def get_active_trades(request: Request):
    db = request.app.state.db
    # In a real impl, we'd fetch prices like the original. For now, empty or mock.
    df = db.query("SELECT * FROM trades WHERE status = 'OPEN'")
    return df.to_dict(orient='records')

@router.get("/history")
async def get_trade_history(request: Request):
    db = request.app.state.db
    df = db.query("SELECT * FROM trades WHERE status = 'CLOSED' ORDER BY exit_timestamp DESC")
    return df.to_dict(orient='records')

@router.get("/performance")
async def get_performance(request: Request):
    db = request.app.state.db
    # Mock performance matching original structure
    return {
        "initial_balance": 100000,
        "total_pnl": 0.0,
        "total_equity": 100000,
        "win_rate": "0%",
        "total_trades": 0,
        "currency": "$"
    }

@router.post("/execute")
async def execute_trade(request: Request, body: dict):
    db = request.app.state.db
    trade_id = str(uuid.uuid4())
    
    try:
        sql = """
            INSERT INTO trades (id, symbol, side, entry_price, quantity, status, strategy)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        await db.execute(sql, [
            trade_id,
            body.get('symbol', 'UNKNOWN').upper(),
            body.get('side', 'BUY'),
            body.get('price', 0.0),
            body.get('quantity', 0),
            'OPEN',
            body.get('strategy', 'MANUAL')
        ])
        
        # Return the created trade
        df = db.query("SELECT * FROM trades WHERE id = ?", [trade_id])
        return df.iloc[0].to_dict()
    except Exception as e:
        logger.error(f"Error executing trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/close/{trade_id}")
async def close_trade(request: Request, trade_id: str):
    db = request.app.state.db
    try:
        await db.execute("""
            UPDATE trades 
            SET status = 'CLOSED', exit_timestamp = ?, exit_price = entry_price * 1.02, pnl = quantity * entry_price * 0.02
            WHERE id = ?
        """, [datetime.now(), trade_id])
        return {"id": trade_id, "status": "CLOSED"}
    except Exception as e:
        logger.error(f"Error closing trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_trade_config():
    """Returns local risk management and trade settings."""
    return {
        "max_risk_per_trade": 0.02,
        "default_leverage": 1,
        "broker_connected": False,
        "local_mode": True,
        "default_strategy": "MANUAL"
    }
