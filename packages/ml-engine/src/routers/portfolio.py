"""
Portfolio Metrics Router — GET /api/v1/portfolio/metrics

Calculates real portfolio-level risk metrics using 252 days of
historical daily returns from yfinance.

Metrics:
  • Drawdown   — (peak portfolio value − current) / peak
  • Beta       — cov(portfolio, SPY) / var(SPY)
  • Sharpe     — (mean excess return / std) × √252
"""

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from cachetools import TTLCache
from pydantic import BaseModel
import pandas as pd
import numpy as np
import yfinance as yf
import logging
from typing import Optional

from backtester import get_risk_free_rate

logger   = logging.getLogger(__name__)
# Removed prefix because main.py will add app.include_router(..., prefix="/api/v1/portfolio")
router   = APIRouter()
limiter  = Limiter(key_func=get_remote_address)

# Cache portfolio metrics for 5 minutes per unique holding set
_metrics_cache: TTLCache = TTLCache(maxsize=64, ttl=300)

BENCHMARK    = "SPY"
LOOKBACK     = "1y"
TRADING_DAYS = 252


# ------------------------------------------------------------------ #
#  Request / Response models                                           #
# ------------------------------------------------------------------ #

class Holding(BaseModel):
    symbol:   str
    quantity: float
    avg_cost: float   # cost per share (used for drawdown reference)


class MetricsRequest(BaseModel):
    holdings: list[Holding]


# ------------------------------------------------------------------ #
#  Core calculations                                                   #
# ------------------------------------------------------------------ #

def _fetch_prices(tickers: list[str]) -> pd.DataFrame:
    """
    Download 1-year of daily adjusted closing prices for all tickers
    plus the SPY benchmark in a single yfinance call.
    """
    symbols = list(set(tickers + [BENCHMARK]))
    raw = yf.download(symbols, period=LOOKBACK, progress=False, auto_adjust=True)

    if isinstance(raw.columns, pd.MultiIndex):
        # yfinance returns (metric, ticker) MultiIndex for multiple tickers
        prices = raw["Close"]
    else:
        prices = raw[["Close"]]
        prices.columns = symbols

    prices.dropna(how="all", inplace=True)
    return prices


def _portfolio_daily_returns(
    prices: pd.DataFrame,
    holdings: list[Holding],
) -> pd.Series:
    """
    Build a value-weighted daily return series for the portfolio.

    Portfolio value on day t = Σ (quantity_i × price_i,t)
    Daily return = (value_t − value_t−1) / value_t−1
    """
    portfolio_value = pd.Series(0.0, index=prices.index)
    for h in holdings:
        sym = h.symbol.upper()
        if sym not in prices.columns:
            logger.warning("Ticker %s not found in price data — skipping", sym)
            continue
        portfolio_value += h.quantity * prices[sym].fillna(method="ffill")

    daily_returns = portfolio_value.pct_change().dropna()
    return daily_returns, portfolio_value


def _beta(
    portfolio_returns: pd.Series,
    spy_returns:       pd.Series,
) -> float:
    """
    Portfolio Beta vs SPY:
      β = Cov(R_portfolio, R_SPY) / Var(R_SPY)

    Aligned on common dates to handle any missing data.
    """
    aligned = pd.concat(
        [portfolio_returns.rename("port"), spy_returns.rename("spy")],
        axis=1
    ).dropna()

    if len(aligned) < 30:
        logger.warning("Insufficient aligned data for Beta — returning 1.0")
        return 1.0

    cov_matrix = np.cov(aligned["port"], aligned["spy"])
    # cov_matrix[0,1] = Cov(port, spy); cov_matrix[1,1] = Var(spy)
    beta = cov_matrix[0, 1] / cov_matrix[1, 1]
    return float(beta)


def _sharpe(daily_returns: pd.Series, risk_free_rate: float) -> float:
    """
    Annualised Sharpe:
      Sharpe = (mean(R − Rf_daily) / std(R)) × √252
    """
    daily_rfr = risk_free_rate / TRADING_DAYS
    excess    = daily_returns - daily_rfr
    std       = daily_returns.std(ddof=1)
    if std == 0 or np.isnan(std):
        return 0.0
    return float((excess.mean() / std) * np.sqrt(TRADING_DAYS))


def _max_drawdown(portfolio_value: pd.Series) -> float:
    """
    Maximum Drawdown on portfolio value curve:
      MDD = (trough − peak) / peak
    Returns a negative decimal (e.g. −0.12 = −12%).
    """
    running_max = portfolio_value.cummax()
    drawdown    = (portfolio_value - running_max) / running_max
    return float(drawdown.min())


def _current_drawdown(portfolio_value: pd.Series) -> float:
    """
    Drawdown from the all-time high to the current value.
    This is what most traders mean when they say 'drawdown'.
    """
    peak    = float(portfolio_value.max())
    current = float(portfolio_value.iloc[-1])
    if peak == 0:
        return 0.0
    return (current - peak) / peak


# ------------------------------------------------------------------ #
#  Endpoint                                                            #
# ------------------------------------------------------------------ #

@router.post("/metrics")
@limiter.limit("10/minute")
async def portfolio_metrics(body: MetricsRequest, request: Request):
    """
    Calculate real portfolio metrics from live price history.

    Body:
      { "holdings": [{"symbol": "AAPL", "quantity": 10, "avg_cost": 170.0}, ...] }

    Returns:
      drawdown, beta, sharpe, total_value, cost_basis, unrealised_pnl_pct
    """
    if not body.holdings:
        raise HTTPException(status_code=400, detail="holdings list is empty")

    # Deduplicate and validate
    tickers = list({h.symbol.upper() for h in body.holdings})

    # Cache key = sorted tuple of (symbol, qty, cost)
    cache_key = tuple(sorted(
        (h.symbol.upper(), h.quantity, h.avg_cost) for h in body.holdings
    ))
    if cache_key in _metrics_cache:
        return _metrics_cache[cache_key]

    try:
        prices = _fetch_prices(tickers)
    except Exception as exc:
        logger.exception("Price fetch failed")
        raise HTTPException(status_code=502,
                            detail=f"Failed to fetch price data: {exc}")

    # Validate at least one ticker resolved
    resolved = [t for t in tickers if t in prices.columns]
    if not resolved:
        raise HTTPException(status_code=404,
                            detail="None of the provided tickers returned price data")

    risk_free_rate = get_risk_free_rate()

    try:
        port_returns, port_value = _portfolio_daily_returns(prices, body.holdings)
        spy_returns              = prices[BENCHMARK].pct_change().dropna()

        beta_val    = _beta(port_returns, spy_returns)
        sharpe_val  = _sharpe(port_returns, risk_free_rate)
        drawdown    = _current_drawdown(port_value)
        max_dd      = _max_drawdown(port_value)

        # Current portfolio value and cost basis
        current_prices = prices.iloc[-1]
        total_value  = sum(
            h.quantity * float(current_prices.get(h.symbol.upper(), 0))
            for h in body.holdings
        )
        cost_basis = sum(h.quantity * h.avg_cost for h in body.holdings)
        unrealised_pnl_pct = (total_value - cost_basis) / cost_basis \
                             if cost_basis > 0 else 0.0

    except Exception as exc:
        logger.exception("Metrics calculation failed")
        raise HTTPException(status_code=500,
                            detail=f"Calculation error: {exc}")

    result = {
        "drawdown":          round(drawdown,           4),
        "max_drawdown":      round(max_dd,             4),
        "beta":              round(beta_val,            3),
        "sharpe":            round(sharpe_val,          3),
        "total_value":       round(total_value,         2),
        "cost_basis":        round(cost_basis,          2),
        "unrealised_pnl_pct":round(unrealised_pnl_pct, 4),
        "risk_free_rate":    round(risk_free_rate,      4),
        "benchmark":         BENCHMARK,
        "tickers_resolved":  resolved,
    }

    _metrics_cache[cache_key] = result
    return result
