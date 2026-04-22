# packages/ml-engine/src/routers/predict.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

import asyncio
import json
import logging
import os
from datetime import UTC, datetime
from pathlib import Path as FilePath

from app.services.ml_engine import MarketAnalyzer
from fastapi import APIRouter, HTTPException, Path, Query, Request

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/symbols/{exchange}")
async def get_exchange_symbols(
    request: Request,
    exchange: str = Path(..., pattern=r"^(nse|bse|nasdaq|nyse|us)$")
):
    exchange = exchange.upper()
    if exchange == "US":
        exchange = "NASDAQ"
    symbols_mgr = request.app.state.symbols
    
    try:
        # Query symbols for the specific exchange from the DB
        # We use a broad search or a specialized method if available
        # But SymbolsManager doesn't have 'get_by_exchange' yet, so we'll use a search query or add it
        results = await symbols_mgr.search_symbols("", exchange=exchange, limit=1000)
        
        if not results:
            # Fallback to legacy JSON if DB is not populated yet
            logger.warning(f"No symbols found in DB for {exchange}, falling back to static JSON.")
            exchange_files = {
                "NSE": "nse_symbols.json",
                "BSE": "bse_symbols.json",
                "NASDAQ": "nasdaq_symbols.json",
                "NYSE": "nyse_symbols.json",
            }
            file_path = FilePath(__file__).parent.parent / "data" / exchange_files[exchange]
            if file_path.exists():
                with open(file_path) as f:
                    return json.load(f)
        
        return results
    except Exception as e:
        logger.error(f"Failed to fetch symbols for {exchange}: {e}")
        raise HTTPException(status_code=500, detail="Failed to load symbols.")


@router.get("/{symbol}")
async def get_prediction(
    request: Request,
    symbol: str = Path(..., pattern=r"^[A-Z0-9.-]{1,20}$"),
    interval: str = Query("1h", pattern=r"^\d+(m|h|d|wk|mo)$"),
    period: str = Query("1mo", pattern=r"^\d+(d|mo|y)$"),
):
    symbol = symbol.upper()
    logger.info(f"Prediction requested: {symbol} (interval={interval}, period={period})")

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
        await db.execute(
            sql,
            [
                pred_id,
                symbol,
                "NSE",  # Default for now
                datetime.now(UTC),
                result["prediction"],
                result["confidence"],
                result.get("regime", "NORMAL"),
            ],
        )

        return result

    except Exception as e:
        logger.error(f"Prediction error for {symbol}: {str(e)}")
        # If it's already an HTTPException, re-raise it
        if isinstance(e, HTTPException):
            raise e
        # Mask original error for security
        raise HTTPException(status_code=500, detail="Internal analysis error.")


@router.get("/history/me")
async def get_my_history(request: Request):
    db = request.app.state.db
    df = db.query("SELECT * FROM predictions ORDER BY ts DESC LIMIT 20")
    return df.to_dict(orient="records")
