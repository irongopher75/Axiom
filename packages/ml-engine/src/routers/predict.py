# packages/ml-engine/src/routers/predict.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

import asyncio
import json
import logging
import os
import re
from datetime import UTC, datetime
from pathlib import Path as FilePath

from app.services.ml_engine import MarketAnalyzer
from fastapi import APIRouter, HTTPException, Path, Query, Request

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/symbols/{exchange}")
async def get_exchange_symbols(
    exchange: str = Path(..., pattern=r"^(nse|bse|nasdaq|nyse)$")
):
    exchange = exchange.lower()
    # Map valid exchanges to their data files
    exchange_files = {
        "nse": "nse_symbols.json",
        "bse": "bse_symbols.json",
        "nasdaq": "nasdaq_symbols.json",
        "nyse": "nyse_symbols.json",
    }

    try:
        # In desktop, data files are in the same dir as main.py
        file_path = FilePath(__file__).parent.parent / "data" / exchange_files[exchange]

        if file_path.exists():
            with open(file_path) as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Failed to load symbols for {exchange}: {e}")
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
