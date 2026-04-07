import logging
import math

import yfinance as yf
from fastapi import APIRouter, Depends, Request

from app.core import auth
from app.core.limiter import limiter
from app.db import models
from app.utils.market import AXIOM_TICKER_MAP, get_yf_ticker
from app.utils.resilience import retry_on_failure

router = APIRouter(prefix="/api/v1/quotes", tags=["quotes"])
logger = logging.getLogger(__name__)

# Local watchlist mapping removed in favor of app.utils.market.AXIOM_TICKER_MAP


@router.get("/batch")
@limiter.limit("60/minute")
@retry_on_failure(retries=2)
async def get_batch_quotes(
    request: Request,
    symbols: str = "",
    current_user: models.User = Depends(auth.get_current_active_user),
):
    """
    Returns last-traded prices for requested symbols (or user's watchlist).
    Used to seed the terminal with real-world data for any asset.
    """
    if symbols:
        requested_symbols = symbols.split(",")
    elif current_user.watchlist:
        requested_symbols = current_user.watchlist
    else:
        requested_symbols = list(AXIOM_TICKER_MAP.keys())

    results = {}

    # Map display names to yfinance tickers
    ticker_map = {}
    for sym in requested_symbols:
        ticker = AXIOM_TICKER_MAP.get(sym, sym)  # Fallback to literal if not in map
        ticker_map[ticker] = sym

    tickers = list(ticker_map.keys())
    if not tickers:
        return {}

    try:
        # Fetch data via yfinance
        data = yf.download(
            tickers, period="2d", interval="1d", progress=False, threads=True, auto_adjust=True
        )

        close_data = data["Close"]

        for ticker, display_name in ticker_map.items():
            try:
                # Handle both single and multi-ticker returns from yfinance
                series = close_data[ticker] if len(tickers) > 1 else close_data
                series = series.dropna()

                if not series.empty:
                    price = float(series.iloc[-1])
                    prev = float(series.iloc[-2]) if len(series) > 1 else price

                    # Basic currency detection based on exchange suffix
                    currency = (
                        "INR"
                        if ticker.endswith(".NS")
                        or ticker.endswith(".BO")
                        or ticker == "^NSEI"
                        or ticker == "^BSESN"
                        else "USD"
                    )
                    if "USDT" in display_name or "-" in ticker:  # Crypto
                        currency = "USDT"

                    if math.isnan(price):
                        continue

                    results[display_name] = {
                        "price": round(price, 2),
                        "prev_close": round(prev, 2),
                        "change_pct": round(((price - prev) / prev) * 100, 2) if prev else 0.0,
                        "up": price >= prev,
                        "currency": currency,
                        "stale": True,
                    }
            except Exception as e:
                logger.warning(f"Failed to parse {display_name} ({ticker}): {e}")

    except Exception as e:
        logger.error(f"Batch quote fetch failed: {e}")

    return results


@router.get("/macro/yields")
@limiter.limit("20/minute")
@retry_on_failure(retries=2)
async def get_macro_yields(
    request: Request, current_user: models.User = Depends(auth.get_current_active_user)
):
    """Returns real-time sovereign yield curve data using yfinance Treasury symbols."""
    symbols = {
        "US": {"3M": "^IRX", "2Y": "^ZT", "5Y": "^FVX", "10Y": "^TNX", "30Y": "^TYX"},
    }

    results = {"US": []}

    try:
        us_tickers = list(symbols["US"].values())
        data = yf.download(us_tickers, period="2d", interval="1d", progress=False, threads=True)
        if not data.empty and "Close" in data:
            for maturity, ticker in symbols["US"].items():
                try:
                    series = (
                        data["Close"][ticker].dropna()
                        if len(us_tickers) > 1
                        else data["Close"].dropna()
                    )
                    if not series.empty:
                        val = float(series.iloc[-1])
                        prev = float(series.iloc[-2]) if len(series) > 1 else val
                        chg_bps = (val - prev) * 100 if prev else 0.0

                        if math.isnan(val):
                            continue

                        results["US"].append(
                            {
                                "maturity": maturity,
                                "yield": round(
                                    val, 3
                                ),  # IRX is actually a discount yield but close enough
                                "chg_bps": round(chg_bps, 1) if not math.isnan(chg_bps) else 0.0,
                                "up": chg_bps >= 0 if not math.isnan(chg_bps) else True,
                            }
                        )
                except Exception:
                    pass
    except Exception as e:
        logger.error(f"Failed to fetch US yields: {e}")

    return results


@router.get("/macro/fx")
@limiter.limit("20/minute")
@retry_on_failure(retries=2)
async def get_macro_fx(
    request: Request, current_user: models.User = Depends(auth.get_current_active_user)
):
    """Returns real-time Forex rates."""
    pairs = {
        "DX-Y.NYB": "DXY",
        "USDINR=X": "USD/INR",
        "EURUSD=X": "EUR/USD",
        "GBPUSD=X": "GBP/USD",
        "JPY=X": "USD/JPY",
        "AUDUSD=X": "AUD/USD",
        "CHF=X": "USD/CHF",
    }
    results = []
    try:
        data = yf.download(
            list(pairs.keys()), period="2d", interval="1d", progress=False, threads=True
        )
        if not data.empty and "Close" in data:
            for ticker, label in pairs.items():
                try:
                    series = (
                        data["Close"][ticker].dropna() if len(pairs) > 1 else data["Close"].dropna()
                    )
                    if not series.empty:
                        price = float(series.iloc[-1])
                        prev = float(series.iloc[-2]) if len(series) > 1 else price
                        chg_pct = ((price - prev) / prev) * 100 if prev else 0.0

                        if math.isnan(price):
                            continue

                        results.append(
                            {
                                "symbol": label,
                                "price": round(price, 4) if price < 100 else round(price, 2),
                                "change_pct": round(chg_pct, 2) if not math.isnan(chg_pct) else 0.0,
                                "up": chg_pct >= 0 if not math.isnan(chg_pct) else True,
                            }
                        )
                except Exception:
                    pass
    except Exception as e:
        logger.error(f"Failed to fetch FX rates: {e}")
    return {"assets": results}


@router.get("/macro/commodities")
@limiter.limit("20/minute")
@retry_on_failure(retries=2)
async def get_macro_commodities(
    request: Request, current_user: models.User = Depends(auth.get_current_active_user)
):
    """Returns real-time Commodities prices."""
    pairs = {
        "CL=F": "WTI Crude",
        "BZ=F": "Brent Crude",
        "NG=F": "Natural Gas",
        "GC=F": "Gold",
        "SI=F": "Silver",
        "HG=F": "Copper",
    }
    results = []
    try:
        data = yf.download(
            list(pairs.keys()), period="2d", interval="1d", progress=False, threads=True
        )
        if not data.empty and "Close" in data:
            for ticker, label in pairs.items():
                try:
                    series = (
                        data["Close"][ticker].dropna() if len(pairs) > 1 else data["Close"].dropna()
                    )
                    if not series.empty:
                        price = float(series.iloc[-1])
                        prev = float(series.iloc[-2]) if len(series) > 1 else price
                        chg_pct = ((price - prev) / prev) * 100 if prev else 0.0

                        if math.isnan(price):
                            continue

                        results.append(
                            {
                                "symbol": label,
                                "price": round(price, 2),
                                "change_pct": round(chg_pct, 2) if not math.isnan(chg_pct) else 0.0,
                                "up": chg_pct >= 0 if not math.isnan(chg_pct) else True,
                            }
                        )
                except Exception:
                    pass
    except Exception as e:
        logger.error(f"Failed to fetch commodity rates: {e}")
    return {"assets": results}


@router.get("/macro/crypto")
@limiter.limit("20/minute")
@retry_on_failure(retries=2)
async def get_macro_crypto(
    request: Request, current_user: models.User = Depends(auth.get_current_active_user)
):
    """Returns real-time Crypto prices."""
    pairs = {
        "BTC-USD": "Bitcoin",
        "ETH-USD": "Ethereum",
        "SOL-USD": "Solana",
        "BNB-USD": "BNB",
        "XRP-USD": "XRP",
        "DOGE-USD": "Dogecoin",
    }
    results = []
    try:
        data = yf.download(
            list(pairs.keys()), period="2d", interval="1d", progress=False, threads=True
        )
        if not data.empty and "Close" in data:
            for ticker, label in pairs.items():
                try:
                    series = (
                        data["Close"][ticker].dropna() if len(pairs) > 1 else data["Close"].dropna()
                    )
                    if not series.empty:
                        price = float(series.iloc[-1])
                        prev = float(series.iloc[-2]) if len(series) > 1 else price
                        chg_pct = ((price - prev) / prev) * 100 if prev else 0.0

                        if math.isnan(price):
                            continue

                        results.append(
                            {
                                "symbol": label,
                                "price": round(price, 4) if price < 1 else round(price, 2),
                                "change_pct": round(chg_pct, 2) if not math.isnan(chg_pct) else 0.0,
                                "up": chg_pct >= 0 if not math.isnan(chg_pct) else True,
                            }
                        )
                except Exception:
                    pass
    except Exception as e:
        logger.error(f"Failed to fetch crypto rates: {e}")
    return {"assets": results}


@router.get("/history/{symbol}")
@limiter.limit("20/minute")
@retry_on_failure(retries=2)
async def get_quote_history(
    request: Request,
    symbol: str,
    interval: str = "5m",
    period: str = "1d",
    current_user: models.User = Depends(auth.get_current_active_user),
):
    """
    Returns real historical OHLCV data for a symbol.
    Used to drive the MainChart instead of mock data.
    """
    ticker = get_yf_ticker(symbol)
    try:
        data = yf.download(
            ticker, period=period, interval=interval, progress=False, auto_adjust=True
        )

        if data.empty:
            return []

        # Convert DataFrame to Lightweight Charts format
        # Index is the timestamp
        result = []
        for timestamp, row in data.iterrows():
            result.append(
                {
                    "time": int(timestamp.timestamp()),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": int(row["Volume"]) if "Volume" in row else 0,
                }
            )
        return result
    except Exception as e:
        logger.error(f"Failed to fetch history for {symbol}: {e}")
        return []
