"""
Backtest Router — POST /api/v1/backtest/run
Wraps the Backtester class and exposes it as an HTTP endpoint.
"""

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import logging

from app.utils.fallback_cache import load_cached_payload, save_cached_payload
from backtester import Backtester

logger  = logging.getLogger(__name__)
# Removed prefix because main.py already adds app.include_router(..., prefix="/api/v1/backtest")
router  = APIRouter()
limiter = Limiter(key_func=get_remote_address)

FALLBACK_BACKTEST = {
    "AAPL": {
        "ticker": "AAPL",
        "strategy": "SMA Crossover (Fallback)",
        "total_return": 0.08,
        "annualised_return": 0.08,
        "sharpe_ratio": 0.9,
        "sortino_ratio": 1.1,
        "max_drawdown": -0.06,
        "win_rate": 0.55,
        "num_trades": 6,
        "risk_free_rate": 0.04,
        "trades": [],
        "is_fallback_data": True,
    }
}


class BacktestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ticker:         str
    period:         str            = "1y"
    fast_sma:       int            = Field(default=20, ge=2, le=200)
    slow_sma:       int            = Field(default=50, ge=2, le=500)
    # Optional override — omit to use the live ^IRX rate
    risk_free_rate: Optional[float] = Field(default=None, ge=0, le=0.2)


@router.post("/run")
@limiter.limit("10/minute")
async def run_backtest(body: BacktestRequest, request: Request):
    """
    Run an SMA-crossover backtest for the given ticker.

    Parameters:
      ticker          — stock symbol (e.g. "AAPL")
      period          — yfinance period string (e.g. "1y", "2y")
      fast_sma        — fast SMA window (default 20)
      slow_sma        — slow SMA window (default 50)
      risk_free_rate  — optional annual rate (omit to use live ^IRX)

    Returns:
      total_return, annualised_return, sharpe_ratio, sortino_ratio,
      max_drawdown, win_rate, num_trades, risk_free_rate, trades[]
    """
    if body.fast_sma >= body.slow_sma:
        raise HTTPException(
            status_code=400,
            detail="fast_sma must be strictly less than slow_sma"
        )
    cache_key = (
        f"{body.ticker.upper()}::{body.period}::{body.fast_sma}::{body.slow_sma}::"
        f"{body.risk_free_rate}"
    )

    try:
        bt     = Backtester(
            ticker         = body.ticker,
            period         = body.period,
            fast_sma       = body.fast_sma,
            slow_sma       = body.slow_sma,
            risk_free_rate = body.risk_free_rate,
        )
        result = bt.run()
    except ValueError as exc:
        cached = load_cached_payload(request.app.state.data_dir, "backtest-run", cache_key)
        if cached:
            return cached["payload"] | {
                "is_fallback_data": True,
                "cached_at": cached.get("cached_at"),
            }
        fallback = FALLBACK_BACKTEST.get(body.ticker.upper())
        if fallback:
            return fallback
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Backtest failed for %s", body.ticker)
        cached = load_cached_payload(request.app.state.data_dir, "backtest-run", cache_key)
        if cached:
            return cached["payload"] | {
                "is_fallback_data": True,
                "cached_at": cached.get("cached_at"),
            }
        fallback = FALLBACK_BACKTEST.get(body.ticker.upper())
        if fallback:
            return fallback
        raise HTTPException(status_code=500, detail=f"Backtest error: {exc}")

    payload = {
        "ticker":             result.ticker,
        "strategy":           result.strategy,
        "total_return":       result.total_return,
        "annualised_return":  result.annualised_return,
        "sharpe_ratio":       result.sharpe_ratio,
        "sortino_ratio":      result.sortino_ratio,
        "max_drawdown":       result.max_drawdown,
        "win_rate":           result.win_rate,
        "num_trades":         result.num_trades,
        "risk_free_rate":     result.risk_free_rate,
        "trades":             [t.__dict__ for t in result.trades],
    }
    save_cached_payload(request.app.state.data_dir, "backtest-run", cache_key, payload)
    return payload
