"""
Backtester — pure mathematical strategy backtesting engine.

Key changes from mock version:
  • Risk-free rate fetched from ^IRX (13-week T-Bill) at startup and cached.
  • Sharpe and Sortino computed correctly from daily return series.
  • All calculations annotated with their formulas.
"""

import numpy as np
import pandas as pd
import yfinance as yf
import logging
import os
from dataclasses import dataclass, field
from typing import Optional
from cachetools import TTLCache

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------ #
#  Risk-free rate — fetched once, cached for 24 hours                 #
# ------------------------------------------------------------------ #

_rfr_cache: TTLCache = TTLCache(maxsize=1, ttl=86_400)  # 24 h


def _fetch_risk_free_rate() -> float:
    """
    Fetch the annualised risk-free rate from the 13-week Treasury Bill (^IRX).

    ^IRX is quoted as an annualised yield in percent (e.g. 5.22 = 5.22% p.a.).
    We divide by 100 to convert to a decimal.

    Falls back to the environment variable RISK_FREE_RATE, then to 0.04.
    """
    try:
        data = yf.download("^IRX", period="5d", progress=False, auto_adjust=True)
        if not data.empty:
            # Flatten MultiIndex if present
            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.get_level_values(0)
            rate = float(data["Close"].dropna().iloc[-1]) / 100.0
            logger.info("Risk-free rate fetched from ^IRX: %.4f", rate)
            return rate
    except Exception as exc:
        logger.warning("Could not fetch ^IRX: %s", exc)

    # Environment variable fallback
    env_rate = os.getenv("RISK_FREE_RATE")
    if env_rate:
        try:
            return float(env_rate)
        except ValueError:
            pass

    logger.warning("Using default risk-free rate: 0.04")
    return 0.04


def get_risk_free_rate() -> float:
    """Return cached risk-free rate, fetching if necessary."""
    if "rfr" not in _rfr_cache:
        _rfr_cache["rfr"] = _fetch_risk_free_rate()
    return _rfr_cache["rfr"]


# Pre-fetch at import time (server startup)
try:
    get_risk_free_rate()
except Exception as exc:
    logger.warning("Startup risk-free rate prefetch failed: %s", exc)


# ------------------------------------------------------------------ #
#  Data classes                                                        #
# ------------------------------------------------------------------ #

@dataclass
class Trade:
    entry_date: str
    exit_date:  str
    entry_price: float
    exit_price:  float
    pnl_pct:     float        # (exit − entry) / entry
    direction:   str          # "LONG" | "SHORT"


@dataclass
class BacktestResult:
    ticker:          str
    strategy:        str
    total_return:    float     # e.g. 0.23 = 23%
    annualised_return: float
    sharpe_ratio:    float
    sortino_ratio:   float
    max_drawdown:    float     # e.g. −0.15 = −15%
    win_rate:        float     # 0–1
    num_trades:      int
    risk_free_rate:  float
    trades:          list[Trade] = field(default_factory=list)


# ------------------------------------------------------------------ #
#  Backtester core                                                     #
# ------------------------------------------------------------------ #

class Backtester:
    """
    Simple SMA-crossover backtester.

    Strategy:
      • BUY  signal: fast SMA crosses above slow SMA
      • SELL signal: fast SMA crosses below  slow SMA

    Risk metrics use Sharpe and Sortino based on daily returns of the
    equity curve, not individual trade P&L — this is the correct approach.
    """

    DEFAULT_FAST_SMA = 20
    DEFAULT_SLOW_SMA = 50
    TRADING_DAYS     = 252

    def __init__(
        self,
        ticker:    str,
        period:    str   = "1y",
        fast_sma:  int   = DEFAULT_FAST_SMA,
        slow_sma:  int   = DEFAULT_SLOW_SMA,
        risk_free_rate: Optional[float] = None,
    ):
        self.ticker          = ticker.upper()
        self.period          = period
        self.fast_sma        = fast_sma
        self.slow_sma        = slow_sma
        # Use provided rate or fall back to dynamic cached value
        self.risk_free_rate  = risk_free_rate if risk_free_rate is not None \
                               else get_risk_free_rate()

    # ---------------------------------------------------------------- #
    #  Data                                                             #
    # ---------------------------------------------------------------- #

    def _load(self) -> pd.DataFrame:
        raw = yf.download(self.ticker, period=self.period,
                          progress=False, auto_adjust=True)
        if raw.empty:
            raise ValueError(f"No data for ticker '{self.ticker}'")
        if isinstance(raw.columns, pd.MultiIndex):
            raw.columns = raw.columns.get_level_values(0)
        df = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.dropna(inplace=True)
        return df

    # ---------------------------------------------------------------- #
    #  Signal generation                                                #
    # ---------------------------------------------------------------- #

    def _signals(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate long/flat positions from SMA crossover.
          position = +1 (long) when fast SMA > slow SMA
          position =  0 (flat) otherwise
        """
        df = df.copy()
        df["SMA_Fast"] = df["Close"].rolling(self.fast_sma).mean()
        df["SMA_Slow"] = df["Close"].rolling(self.slow_sma).mean()
        df["Position"] = np.where(df["SMA_Fast"] > df["SMA_Slow"], 1, 0)
        df.dropna(inplace=True)
        return df

    # ---------------------------------------------------------------- #
    #  Equity curve                                                     #
    # ---------------------------------------------------------------- #

    def _equity_curve(self, df: pd.DataFrame) -> pd.Series:
        """
        Daily return of the strategy:
          strategy_return[t] = position[t−1] × price_return[t]

        We use the previous day's position to avoid look-ahead bias.
        The equity curve is the cumulative product of (1 + strategy_return).
        """
        price_return    = df["Close"].pct_change()
        strategy_return = df["Position"].shift(1) * price_return
        equity          = (1 + strategy_return.fillna(0)).cumprod()
        return equity, strategy_return.fillna(0)

    # ---------------------------------------------------------------- #
    #  Risk metrics                                                     #
    # ---------------------------------------------------------------- #

    def _sharpe(self, daily_returns: pd.Series) -> float:
        """
        Annualised Sharpe Ratio:
          Sharpe = (mean_daily_excess_return / std_daily_return) × √252

        where excess = daily_return − daily_risk_free
              daily_risk_free = annual_rate / 252
        """
        daily_rfr = self.risk_free_rate / self.TRADING_DAYS
        excess    = daily_returns - daily_rfr
        std       = daily_returns.std(ddof=1)
        if std == 0:
            return 0.0
        return float((excess.mean() / std) * np.sqrt(self.TRADING_DAYS))

    def _sortino(self, daily_returns: pd.Series) -> float:
        """
        Annualised Sortino Ratio:
          Sortino = (mean_daily_excess_return / downside_std) × √252

        downside_std considers only returns below the daily risk-free rate
        (i.e. the semi-standard deviation of the downside).
        """
        daily_rfr    = self.risk_free_rate / self.TRADING_DAYS
        excess       = daily_returns - daily_rfr
        downside     = excess[excess < 0]
        downside_std = downside.std(ddof=1)
        if downside_std == 0 or np.isnan(downside_std):
            return 0.0
        return float((excess.mean() / downside_std) * np.sqrt(self.TRADING_DAYS))

    def _max_drawdown(self, equity: pd.Series) -> float:
        """
        Maximum Drawdown:
          MDD = (trough_value − peak_value) / peak_value

        Calculated on the running maximum of the equity curve.
        Returns a negative decimal (e.g. −0.15 = −15% drawdown).
        """
        running_max = equity.cummax()
        drawdown    = (equity - running_max) / running_max
        return float(drawdown.min())

    def _annualised_return(self, equity: pd.Series) -> float:
        """
        Compounded Annualised Growth Rate (CAGR):
          CAGR = (final_equity / initial_equity)^(252/n) − 1
        """
        n = len(equity)
        if n < 2:
            return 0.0
        return float((equity.iloc[-1] / equity.iloc[0]) ** (self.TRADING_DAYS / n) - 1)

    # ---------------------------------------------------------------- #
    #  Trade extraction                                                 #
    # ---------------------------------------------------------------- #

    def _extract_trades(self, df: pd.DataFrame) -> list[Trade]:
        """
        Walk through position changes to extract individual round-trip trades.
        Entry on 0→1 transition, exit on 1→0 transition.
        """
        trades    = []
        pos_diff  = df["Position"].diff().fillna(0)
        entries   = df.index[pos_diff == 1].tolist()
        exits     = df.index[pos_diff == -1].tolist()

        # Pair entries with the next exit
        for entry_dt in entries:
            future_exits = [e for e in exits if e > entry_dt]
            if not future_exits:
                break
            exit_dt     = future_exits[0]
            entry_price = float(df.loc[entry_dt, "Close"])
            exit_price  = float(df.loc[exit_dt,  "Close"])
            pnl_pct     = (exit_price - entry_price) / entry_price

            trades.append(Trade(
                entry_date  = str(entry_dt.date()),
                exit_date   = str(exit_dt.date()),
                entry_price = round(entry_price, 4),
                exit_price  = round(exit_price,  4),
                pnl_pct     = round(pnl_pct, 4),
                direction   = "LONG",
            ))
        return trades

    # ---------------------------------------------------------------- #
    #  Public run method                                                #
    # ---------------------------------------------------------------- #

    def run(self) -> BacktestResult:
        """Execute the full backtest and return a BacktestResult."""
        df             = self._load()
        df             = self._signals(df)
        equity, returns = self._equity_curve(df)
        trades         = self._extract_trades(df)

        total_return  = float(equity.iloc[-1] - 1)
        win_rate      = (
            len([t for t in trades if t.pnl_pct > 0]) / len(trades)
            if trades else 0.0
        )

        return BacktestResult(
            ticker             = self.ticker,
            strategy           = f"SMA{self.fast_sma}/{self.slow_sma} Crossover",
            total_return       = round(total_return, 4),
            annualised_return  = round(self._annualised_return(equity), 4),
            sharpe_ratio       = round(self._sharpe(returns), 3),
            sortino_ratio      = round(self._sortino(returns), 3),
            max_drawdown       = round(self._max_drawdown(equity), 4),
            win_rate           = round(win_rate, 3),
            num_trades         = len(trades),
            risk_free_rate     = round(self.risk_free_rate, 4),
            trades             = trades,
        )
