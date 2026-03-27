# packages/ml-engine/src/routers/predict.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

from fastapi import APIRouter, HTTPException, Request
from ml_engine import MarketAnalyzer
from risk_engine import RiskEngine
import logging
import re
import json
import os
import asyncio
from typing import List
from datetime import datetime, timezone
from pathlib import Path

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/symbols/{exchange}")
async def get_exchange_symbols(exchange: str):
    exchange = exchange.lower()
    # Map valid exchanges to their data files
    exchange_files = {
        "nse": "nse_symbols.json",
        "bse": "bse_symbols.json",
        "nasdaq": "nasdaq_symbols.json",
        "nyse": "nyse_symbols.json"
    }
    
    if exchange not in exchange_files:
        raise HTTPException(status_code=404, detail="Exchange not supported")
        
    # In desktop, data files are in the same dir as main.py
    file_path = Path(__file__).parent.parent / "data" / exchange_files[exchange]
    
    if file_path.exists():
        with open(file_path, 'r') as f:
            return json.load(f)
    return []

@router.get("/{symbol}")
async def get_prediction(
    request: Request,
    symbol: str, 
    interval: str = "1h",
    period: str = "1mo"
):
    symbol = symbol.upper()
    if not re.match(r"^[A-Z0-9.-]{1,20}$", symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    
    db = request.app.state.db
    
    try:
        analyzer = MarketAnalyzer(symbol)
        await analyzer.fetch_data(period=period, interval=interval)
        
        # CPU-bound
        result = await asyncio.to_thread(analyzer.predict_direction)
        
        # Save prediction to DuckDB
        sql = """
            INSERT INTO predictions (id, symbol, exchange, ts, direction, confidence, regime)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        pred_id = f"PRED-{os.urandom(4).hex().upper()}"
        await db.execute(sql, [
            pred_id, 
            symbol, 
            "NSE", # Default for now
            datetime.now(timezone.utc),
            result['prediction'],
            result['confidence'],
            result.get('regime', 'NORMAL')
        ])
        
        return result
        
    except Exception as e:
        logger.error(f"Prediction error for {symbol}: {str(e)}")
        # If it's already an HTTPException, re-raise it
        if isinstance(e, HTTPException):
            raise e
        # Otherwise, reveal the cause for easier debugging in local sidecar
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/me")
async def get_my_history(request: Request):
    db = request.app.state.db
    df = db.query("SELECT * FROM predictions ORDER BY ts DESC LIMIT 20")
    return df.to_dict(orient='records')
