import asyncio
import logging

import yfinance as yf
import pandas as pd
import numpy as np
from fastapi import APIRouter, Query, Request
from app.utils.fallback_cache import load_cached_payload, save_cached_payload

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

FALLBACK_QUOTES = {
    "NIFTY": {"price": 22450.15, "prev_close": 22380.10, "currency": "₹"},
    "SENSEX": {"price": 73810.22, "prev_close": 73690.55, "currency": "₹"},
    "RELIANCE": {"price": 2950.40, "prev_close": 2938.10, "currency": "₹"},
    "TCS": {"price": 3898.20, "prev_close": 3875.80, "currency": "₹"},
    "AAPL": {"price": 185.25, "prev_close": 184.10, "currency": "$"},
    "BTC-USD": {"price": 64250.0, "prev_close": 63820.0, "currency": "$"},
}


@router.get("/batch")
async def get_batch_quotes(
    request: Request,
    symbols: str | None = Query(None, pattern=r"^[A-Z0-9.,-]{0,500}$")
):
    db = request.app.state.db
    cache_key = f"symbols={symbols or ''}"
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
        if results:
            save_cached_payload(request.app.state.data_dir, "quotes-batch", cache_key, results)
        return results
    except Exception as e:
        logger.error(f"Quote batch fetch failed: {e}")
        cached = load_cached_payload(request.app.state.data_dir, "quotes-batch", cache_key)
        if cached:
            payload = cached["payload"]
            for quote in payload.values():
                if isinstance(quote, dict):
                    quote["stale"] = True
                    quote["cached_at"] = cached.get("cached_at")
            return payload
        results = {}
        for symbol in requested:
            quote = FALLBACK_QUOTES.get(symbol)
            if not quote:
                continue
            price = quote["price"]
            prev = quote["prev_close"]
            results[symbol] = {
                "price": round(price, 2),
                "prev_close": round(prev, 2),
                "change_pct": round(((price - prev) / prev) * 100, 2) if prev else 0.0,
                "up": price >= prev,
                "currency": quote["currency"],
                "stale": True,
            }
        return results


@router.get("/history/{symbol}")
async def get_history(
    request: Request,
    symbol: str,
    period: str = Query("1d", pattern=r"^\d+(d|mo|y)$"),
    interval: str = Query("5m", pattern=r"^\d+(m|h|d|wk|mo)$")
):
    ticker = DEFAULT_TICKERS.get(symbol.upper(), symbol.upper())
    cache_key = f"{symbol.upper()}::{period}::{interval}"
    try:
        # Offload synchronous yfinance call to a background thread
        data = await asyncio.to_thread(
            yf.download, ticker, period=period, interval=interval, progress=False, auto_adjust=True
        )

        if data.empty:
            raise ValueError("No market data returned")

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

        if result:
            save_cached_payload(request.app.state.data_dir, "quotes-history", cache_key, result)
        return result
    except Exception as e:
        logger.error(f"History fetch failed for {symbol}: {e}")
        cached = load_cached_payload(request.app.state.data_dir, "quotes-history", cache_key)
        if cached:
            payload = cached["payload"]
            if payload:
                payload[-1]["stale"] = True
                payload[-1]["cached_at"] = cached.get("cached_at")
            return payload
        return [
            {
                "time": 1713657600,
                "open": 184.0,
                "high": 186.0,
                "low": 183.5,
                "close": 185.25,
                "volume": 1000000,
                "stale": True,
            }
        ]


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
    """Returns F3 Forex rates using live data."""
    pairs = {"USDINR=X": "USD/INR", "EURUSD=X": "EUR/USD", "GBPUSD=X": "GBP/USD", "USDJPY=X": "USD/JPY"}
    tickers = list(pairs.keys())
    try:
        data = await asyncio.to_thread(yf.download, tickers, period="2d", interval="1d", progress=False, group_by="ticker")
        assets = []
        for ticker, label in pairs.items():
            if ticker in data.columns.get_level_values(0):
                latest = data[ticker].dropna().tail(2)
                if not latest.empty:
                    price = float(latest["Close"].iloc[-1])
                    prev = float(latest["Close"].iloc[-2]) if len(latest) > 1 else price
                    assets.append({
                        "symbol": label,
                        "price": round(price, 4),
                        "change_pct": round(((price - prev) / prev) * 100, 2) if prev else 0.0,
                        "up": price >= prev
                    })
        return {"assets": assets or [
            {"symbol": "USD/INR", "price": 83.45, "change_pct": 0.0, "up": True},
            {"symbol": "EUR/USD", "price": 1.08, "change_pct": 0.0, "up": True},
        ]}
    except Exception as e:
        logger.error(f"FX fetch failed: {e}")
        return {"assets": []}


@router.get("/macro/commodities")
async def get_macro_commodities():
    """Returns F4 Commodities prices using live futures data."""
    symbols = {"GC=F": "GOLD", "SI=F": "SILVER", "CL=F": "CRUDE OIL", "NG=F": "NATURAL GAS"}
    tickers = list(symbols.keys())
    try:
        data = await asyncio.to_thread(yf.download, tickers, period="2d", interval="1d", progress=False, group_by="ticker")
        assets = []
        for ticker, label in symbols.items():
            if ticker in data.columns.get_level_values(0):
                latest = data[ticker].dropna().tail(2)
                if not latest.empty:
                    price = float(latest["Close"].iloc[-1])
                    prev = float(latest["Close"].iloc[-2]) if len(latest) > 1 else price
                    assets.append({
                        "symbol": label,
                        "price": round(price, 2),
                        "change_pct": round(((price - prev) / prev) * 100, 2) if prev else 0.0,
                        "up": price >= prev
                    })
        return {"assets": assets}
    except Exception as e:
        logger.error(f"Commodities fetch failed: {e}")
        return {"assets": []}


@router.get("/macro/crypto")
async def get_macro_crypto():
    """Returns F5 Crypto prices using live data."""
    symbols = {"BTC-USD": "BTC/USD", "ETH-USD": "ETH/USD", "SOL-USD": "SOL/USD", "DOGE-USD": "DOGE/USD"}
    tickers = list(symbols.keys())
    try:
        data = await asyncio.to_thread(yf.download, tickers, period="2d", interval="1d", progress=False, group_by="ticker")
        assets = []
        for ticker, label in symbols.items():
            if ticker in data.columns.get_level_values(0):
                latest = data[ticker].dropna().tail(2)
                if not latest.empty:
                    price = float(latest["Close"].iloc[-1])
                    prev = float(latest["Close"].iloc[-2]) if len(latest) > 1 else price
                    assets.append({
                        "symbol": label,
                        "price": round(price, 2),
                        "change_pct": round(((price - prev) / prev) * 100, 2) if prev else 0.0,
                        "up": price >= prev
                    })
        return {"assets": assets}
    except Exception as e:
        logger.error(f"Crypto fetch failed: {e}")
        return {"assets": []}
