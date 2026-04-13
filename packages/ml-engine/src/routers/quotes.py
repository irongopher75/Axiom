import asyncio
import logging

import yfinance as yf
import pandas as pd
import numpy as np
from fastapi import APIRouter, Query, Request

router = APIRouter()
logger = logging.getLogger(__name__)

# Fallback tickers for terminal
DEFAULT_TICKERS = {
    "NIFTY": "^NSEI",
    "SENSEX": "^BSESN",
    "RELIANCE": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "AAPL": "AAPL",
    "BTC-USD": "BTC-USD",
}


@router.get("/batch")
async def get_batch_quotes(
    request: Request,
    symbols: str | None = Query(None, pattern=r"^[A-Z0-9.,-]{0,500}$")
):
    db = request.app.state.db
    if symbols:
        requested = symbols.split(",")
    else:
        try:
            df_wl = db.query("SELECT symbol FROM watchlist")
            requested = df_wl["symbol"].tolist() if not df_wl.empty else list(DEFAULT_TICKERS.keys())
        except Exception as e:
            logger.error(f"Failed to fetch watchlist: {e}")
            requested = list(DEFAULT_TICKERS.keys())

    if not requested:
        return {}

    ticker_map = {DEFAULT_TICKERS.get(s, s): s for s in requested}
    tickers = list(ticker_map.keys())

    try:
        # Offload synchronous yfinance call to a background thread
        # 2d period gives us today and yesterday for change calculation
        data = await asyncio.to_thread(
            yf.download, tickers, period="2d", interval="1d", progress=False, group_by="ticker"
        )

        if data.empty:
            return {}

        results = {}
        for ticker, display_name in ticker_map.items():
            try:
                # In group_by="ticker", data is a MultiIndex DF: (Ticker, Price)
                if len(tickers) > 1:
                    ticker_data = data[ticker].dropna()
                else:
                    ticker_data = data.dropna()
                    # Flatten if single ticker returned as MultiIndex
                    if isinstance(ticker_data.columns, pd.MultiIndex):
                        ticker_data.columns = ticker_data.columns.get_level_values(0)

                if not ticker_data.empty:
                    # Get the most recent two bars
                    latest_bars = ticker_data.tail(2)
                    price = float(latest_bars["Close"].iloc[-1])
                    prev  = float(latest_bars["Close"].iloc[-2]) if len(latest_bars) > 1 else price
                    
                    results[display_name] = {
                        "price": round(price, 2),
                        "prev_close": round(prev, 2),
                        "change_pct": round(((price - prev) / prev) * 100, 2) if prev else 0.0,
                        "up": price >= prev,
                        "currency": "$" if not (ticker.endswith(".NS") or ticker.endswith(".BO")) else "₹",
                    }
            except Exception as e:
                logger.warning(f"Failed to process quote for {ticker}: {e}")
                continue
        return results
    except Exception as e:
        logger.error(f"Quote batch fetch failed: {e}")
        return {}


@router.get("/history/{symbol}")
async def get_history(
    symbol: str,
    period: str = Query("1d", pattern=r"^\d+(d|mo|y)$"),
    interval: str = Query("5m", pattern=r"^\d+(m|h|d|wk|mo)$")
):
    ticker = DEFAULT_TICKERS.get(symbol.upper(), symbol.upper())
    try:
        # Offload synchronous yfinance call to a background thread
        data = await asyncio.to_thread(
            yf.download, ticker, period=period, interval=interval, progress=False, auto_adjust=True
        )

        if data.empty:
            return []

        # If it's a MultiIndex (yf 0.2.x default for some symbols), 
        # extract the ticker-specific dataframe if symbol is found in level 1
        if isinstance(data.columns, pd.MultiIndex):
            if ticker in data.columns.get_level_values(1):
                data = data.xs(ticker, axis=1, level=1)
            else:
                # Fallback: just flatten if we can't find the specific ticker
                data.columns = data.columns.get_level_values(0)

        result = []
        for ts, row in data.iterrows():
            try:
                # Final safeguard: ensure we have scalar floats
                def _get_val(col):
                    v = row[col]
                    if isinstance(v, (pd.Series, np.ndarray)):
                        return float(v.iloc[0]) if hasattr(v, 'iloc') else float(v[0])
                    return float(v)

                result.append(
                    {
                        "time": int(ts.timestamp()),
                        "open": _get_val("Open"),
                        "high": _get_val("High"),
                        "low":  _get_val("Low"),
                        "close":_get_val("Close"),
                        "volume":int(_get_val("Volume")),
                    }
                )
            except (TypeError, ValueError, KeyError, IndexError):
                continue

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
            {"maturity": "30Y", "yield": 4.38, "chg_bps": 1.8, "up": True},
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
            {"symbol": "USD/JPY", "price": 151.25, "change_pct": 0.22, "up": True},
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
            {"symbol": "NATURAL GAS", "price": 1.78, "change_pct": -2.40, "up": False},
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
            {"symbol": "DOGE/USD", "price": 0.1642, "change_pct": 12.50, "up": True},
        ]
    }
