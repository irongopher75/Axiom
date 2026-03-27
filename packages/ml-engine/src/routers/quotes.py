# packages/ml-engine/src/routers/quotes.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
import yfinance as yf
import logging
import math

router = APIRouter()
logger = logging.getLogger(__name__)

# Fallback tickers for terminal
DEFAULT_TICKERS = {
    "NIFTY": "^NSEI",
    "SENSEX": "^BSESN",
    "RELIANCE": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "AAPL": "AAPL",
    "BTC-USD": "BTC-USD"
}

@router.get("/batch")
async def get_batch_quotes(request: Request, symbols: Optional[str] = None):
    db = request.app.state.db
    if symbols:
        requested = symbols.split(",")
    else:
        df_wl = db.query("SELECT symbol FROM watchlist")
        requested = df_wl['symbol'].tolist() if not df_wl.empty else list(DEFAULT_TICKERS.keys())

    if not requested: return {}
    ticker_map = {DEFAULT_TICKERS.get(s, s): s for s in requested}
    tickers = list(ticker_map.keys())

    try:
        data = yf.download(tickers, period="2d", interval="1d", progress=False)
        if data.empty: return {}
        close_data = data["Close"]
        results = {}
        for ticker, display_name in ticker_map.items():
            try:
                series = close_data[ticker] if len(tickers) > 1 else close_data
                series = series.dropna()
                if not series.empty:
                    price = float(series.iloc[-1])
                    prev = float(series.iloc[-2]) if len(series) > 1 else price
                    results[display_name] = {
                        "price": round(price, 2),
                        "prev_close": round(prev, 2),
                        "change_pct": round(((price - prev) / prev) * 100, 2) if prev else 0.0,
                        "up": price >= prev,
                        "currency": "$" if not (ticker.endswith(".NS") or ticker.endswith(".BO")) else "₹"
                    }
            except Exception: continue
        return results
    except Exception as e:
        logger.error(f"Quote fetch failed: {e}")
        return {}

@router.get("/history/{symbol}")
async def get_history(symbol: str, period: str = "1d", interval: str = "5m"):
    ticker = DEFAULT_TICKERS.get(symbol.upper(), symbol.upper())
    try:
        data = yf.download(ticker, period=period, interval=interval, progress=False)
        if data.empty: return []
        result = []
        for ts, row in data.iterrows():
            result.append({
                "time": int(ts.timestamp()),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            })
        return result
    except Exception as e:
        logger.error(f"History fetch failed for {symbol}: {e}")
        return []

@router.get("/macro/yields")
async def get_macro_yields():
    """Returns F2 Treasury Curve data."""
    return {
        "US": [
            {"maturity": "2Y", "yield": 4.62, "chg_bps": 2.1, "up": True},
            {"maturity": "5Y", "yield": 4.28, "chg_bps": -1.2, "up": False},
            {"maturity": "10Y", "yield": 4.25, "chg_bps": 0.5, "up": True},
            {"maturity": "30Y", "yield": 4.38, "chg_bps": 1.8, "up": True}
        ]
    }

@router.get("/macro/fx")
async def get_macro_fx():
    """Returns F3 Forex rates."""
    return {
        "assets": [
            {"symbol": "USD/INR", "price": 83.4520, "change_pct": 0.12, "up": True},
            {"symbol": "EUR/USD", "price": 1.0825, "change_pct": -0.05, "up": False},
            {"symbol": "GBP/USD", "price": 1.2640, "change_pct": 0.08, "up": True},
            {"symbol": "USD/JPY", "price": 151.25, "change_pct": 0.22, "up": True}
        ]
    }

@router.get("/macro/commodities")
async def get_macro_commodities():
    """Returns F4 Commodities prices."""
    return {
        "assets": [
            {"symbol": "GOLD", "price": 2324.50, "change_pct": 1.15, "up": True},
            {"symbol": "SILVER", "price": 27.25, "change_pct": 0.85, "up": True},
            {"symbol": "CRUDE OIL", "price": 85.12, "change_pct": -1.20, "up": False},
            {"symbol": "NATURAL GAS", "price": 1.78, "change_pct": -2.40, "up": False}
        ]
    }

@router.get("/macro/crypto")
async def get_macro_crypto():
    """Returns F5 Crypto prices."""
    return {
        "assets": [
            {"symbol": "BTC/USD", "price": 64250.00, "change_pct": -2.45, "up": False},
            {"symbol": "ETH/USD", "price": 3120.50, "change_pct": -1.10, "up": False},
            {"symbol": "SOL/USD", "price": 142.25, "change_pct": 5.40, "up": True},
            {"symbol": "DOGE/USD", "price": 0.1642, "change_pct": 12.50, "up": True}
        ]
    }
