import logging
from enum import Enum

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class MarketRegime(Enum):
    BULL_TREND = "BULL_TREND"
    BEAR_TREND = "BEAR_TREND"
    HIGH_VOL_RANGING = "HIGH_VOL_RANGING"
    LOW_VOL_RANGING = "LOW_VOL_RANGING"
    NEUTRAL = "NEUTRAL"


class RegimeDetector:
    """
    Classifies market state based on Moving Averages and Volatility.
    """

    def __init__(self, adx_threshold: float = 25.0):
        self.adx_threshold = adx_threshold

    def detect_regime(self, df: pd.DataFrame) -> MarketRegime:
        """Original single-point detection logic (backward compatible)."""
        if df.empty or len(df) < 50:
            return MarketRegime.NEUTRAL

        last_row = df.iloc[-1]
        close = last_row["Close"]
        sma_200 = last_row.get("SMA_200", close)

        volatility = (last_row.get("ATR", 0) / close) * 100
        vol_median = (df["ATR"] / df["Close"]).median() * 100

        is_trending = abs(close - sma_200) / sma_200 > 0.02

        if is_trending:
            return MarketRegime.BULL_TREND if close > sma_200 else MarketRegime.BEAR_TREND
        else:
            return (
                MarketRegime.HIGH_VOL_RANGING
                if volatility > vol_median * 1.2
                else MarketRegime.LOW_VOL_RANGING
            )

    def detect_regimes_vectorized(self, df: pd.DataFrame) -> pd.Series:
        """
        Vectorized version of detect_regime for high-performance backtesting.
        Returns a Series of MarketRegime objects.
        """
        if df.empty:
            return pd.Series(dtype=object)

        df = df.copy()
        # Ensure required columns exist, fill with defaults if missing
        close = df["Close"]
        sma_200 = df.get("SMA_200", close)
        atr = df.get("ATR", 0)

        # 1. Trend Calculation
        dist_from_sma = (close - sma_200).abs() / sma_200
        is_trending = dist_from_sma > 0.02
        is_bull = close > sma_200

        # 2. Volatility Calculation
        volatility = (atr / close) * 100
        # Rolling median to match the logic where we looked at the tail(100)
        vol_median = volatility.rolling(window=100, min_periods=1).median()

        # 3. Decision Logic (Vectorized)
        conditions = [
            is_trending & is_bull,
            is_trending & ~is_bull,
            ~is_trending & (volatility > vol_median * 1.2),
            ~is_trending & (volatility <= vol_median * 1.2),
        ]
        choices = [
            MarketRegime.BULL_TREND,
            MarketRegime.BEAR_TREND,
            MarketRegime.HIGH_VOL_RANGING,
            MarketRegime.LOW_VOL_RANGING,
        ]

        # Use np.select to assign values based on conditions
        regimes = np.select(conditions, choices, default=MarketRegime.NEUTRAL)

        return pd.Series(regimes, index=df.index)

    def get_strategy_weights(self, regime: MarketRegime) -> dict:
        """
        Returns optimized weights for strategy ensemble based on regime.
        """
        weights = {
            MarketRegime.BULL_TREND: {"scalping": 0.2, "momentum": 0.6, "mean_reversion": 0.2},
            MarketRegime.BEAR_TREND: {"scalping": 0.2, "momentum": 0.5, "mean_reversion": 0.3},
            MarketRegime.HIGH_VOL_RANGING: {
                "scalping": 0.5,
                "momentum": 0.1,
                "mean_reversion": 0.4,
            },
            MarketRegime.LOW_VOL_RANGING: {"scalping": 0.3, "momentum": 0.2, "mean_reversion": 0.5},
            MarketRegime.NEUTRAL: {"scalping": 0.33, "momentum": 0.33, "mean_reversion": 0.34},
        }
        # Handle both Enum and string comparison if necessary, but keep robust
        if isinstance(regime, str):
            try:
                regime = MarketRegime(regime)
            except ValueError:
                return weights[MarketRegime.NEUTRAL]

        return weights.get(regime, weights[MarketRegime.NEUTRAL])
