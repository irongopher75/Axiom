"""
MarketAnalyzer — Pure mathematical market analysis engine.
No ML libraries. All indicators derived from price/volume series using
standard quantitative finance formulas.
"""

import numpy as np
import pandas as pd
import yfinance as yf
from dataclasses import dataclass
from typing import Optional
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class AnalysisResult:
    ticker: str
    support: float
    resistance: float
    volatility: str          # "LOW" | "MODERATE" | "HIGH"
    verdict: str             # "BULLISH" | "BEARISH" | "NEUTRAL"
    confidence: float        # 0.0 – 1.0 (calibrated, not raw)
    current_price: float
    indicators: dict


class MarketAnalyzer:
    """
    Computes technical indicators and derives directional signals
    using only numpy/pandas arithmetic — no scikit-learn, no torch.

    Indicator set:
      • Bollinger Bands  (20-period SMA ± 2σ)
      • ATR              (14-period Average True Range)
      • RSI              (14-period Relative Strength Index)
      • MACD             (12/26 EMA diff, 9-period signal line)
      • Volume ratio     (current volume vs 20-period average)
    """

    # Indicator periods from centralized settings
    @property
    def BB_PERIOD(self): return settings.SMA_FAST
    
    @property
    def BB_STD(self): return 2
    
    @property
    def ATR_PERIOD(self): return settings.ATR_WINDOW
    
    @property
    def RSI_PERIOD(self): return settings.RSI_WINDOW
    
    @property
    def MACD_FAST(self): return 12
    
    @property
    def MACD_SLOW(self): return 26
    
    @property
    def MACD_SIGNAL(self): return 9
    
    @property
    def VOL_PERIOD(self): return 20

    # ATR-as-%-of-price thresholds for volatility classification
    @property
    def VOL_HIGH_THRESH(self): return settings.VOL_HIGH_THRESHOLD
    
    @property
    def VOL_LOW_THRESH(self): return settings.VOL_LOW_THRESHOLD

    def __init__(self, ticker: str, period: str = "3mo"):
        self.ticker = ticker.upper()
        self.period = period
        self._df: Optional[pd.DataFrame] = None

    # ------------------------------------------------------------------ #
    #  Data fetch                                                          #
    # ------------------------------------------------------------------ #

    def fetch(self) -> "MarketAnalyzer":
        """Download OHLCV data via yfinance and store internally."""
        raw = yf.download(self.ticker, period=self.period, progress=False, auto_adjust=True, group_by="ticker")
        if raw.empty:
            raise ValueError(f"No data returned for ticker '{self.ticker}'")

        # Robust MultiIndex flattening (handles yfinance 0.2.x structures)
        if isinstance(raw.columns, pd.MultiIndex):
            if self.ticker in raw.columns.get_level_values(1):
                raw = raw.xs(self.ticker, axis=1, level=1)
            else:
                raw.columns = raw.columns.get_level_values(0)

        self._df = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
        self._df.dropna(inplace=True)
        return self

    # ------------------------------------------------------------------ #
    #  Individual indicators                                               #
    # ------------------------------------------------------------------ #

    def _bollinger_bands(self) -> pd.DataFrame:
        """
        Bollinger Bands
          Middle = SMA(Close, 20)
          Upper  = Middle + 2 × rolling_std(Close, 20)
          Lower  = Middle − 2 × rolling_std(Close, 20)
        """
        close = self._df["Close"]
        mid   = close.rolling(self.BB_PERIOD).mean()
        std   = close.rolling(self.BB_PERIOD).std(ddof=1)
        return pd.DataFrame({
            "BB_Mid":   mid,
            "BB_Upper": mid + self.BB_STD * std,
            "BB_Lower": mid - self.BB_STD * std,
        })

    def _atr(self) -> pd.Series:
        """
        Average True Range (Wilder, 14-period)
          TR  = max(High−Low, |High−PrevClose|, |Low−PrevClose|)
          ATR = EMA(TR, 14)  [Wilder's smoothing = span = 2*n−1]
        """
        high  = self._df["High"]
        low   = self._df["Low"]
        close = self._df["Close"]
        prev  = close.shift(1)

        tr = pd.concat([
            high - low,
            (high - prev).abs(),
            (low  - prev).abs(),
        ], axis=1).max(axis=1)

        # Wilder smoothing: alpha = 1/period
        return tr.ewm(alpha=1 / self.ATR_PERIOD, adjust=False).mean()

    def _rsi(self) -> pd.Series:
        """
        RSI (Wilder, 14-period)
          delta  = Close − PrevClose
          RS     = EMA(gains, 14) / EMA(losses, 14)
          RSI    = 100 − (100 / (1 + RS))
        """
        delta = self._df["Close"].diff()
        gain  = delta.clip(lower=0)
        loss  = (-delta).clip(lower=0)

        avg_gain = gain.ewm(alpha=1 / self.RSI_PERIOD, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1 / self.RSI_PERIOD, adjust=False).mean()

        rs  = avg_gain / avg_loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)  # neutral fill on warm-up bars

    def _macd(self) -> pd.DataFrame:
        """
        MACD
          MACD_Line   = EMA(Close, 12) − EMA(Close, 26)
          Signal_Line = EMA(MACD_Line, 9)
          Histogram   = MACD_Line − Signal_Line
        """
        close   = self._df["Close"]
        ema_fast = close.ewm(span=self.MACD_FAST,   adjust=False).mean()
        ema_slow = close.ewm(span=self.MACD_SLOW,   adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal    = macd_line.ewm(span=self.MACD_SIGNAL, adjust=False).mean()
        return pd.DataFrame({
            "MACD":      macd_line,
            "Signal":    signal,
            "Histogram": macd_line - signal,
        })

    def _vol_ratio(self) -> pd.Series:
        """
        Volume ratio = current volume / 20-period average volume.
        Values > 1 indicate above-average activity.
        """
        vol = self._df["Volume"]
        return vol / vol.rolling(self.VOL_PERIOD).mean()

    # ------------------------------------------------------------------ #
    #  Composite indicators                                                #
    # ------------------------------------------------------------------ #

    def calculate_indicators(self) -> pd.DataFrame:
        """Merge all indicator series into a single aligned DataFrame."""
        if self._df is None:
            raise RuntimeError("Call .fetch() before .calculate_indicators()")

        bb   = self._bollinger_bands()
        atr  = self._atr().rename("ATR")
        rsi  = self._rsi().rename("RSI")
        macd = self._macd()
        vr   = self._vol_ratio().rename("Vol_Ratio")

        # ATR as percentage of price — used for volatility classification
        atr_pct = (atr / self._df["Close"] * 100).rename("ATR_Pct")

        result = pd.concat([self._df, bb, atr, atr_pct, rsi, macd, vr], axis=1)
        result.dropna(inplace=True)
        return result

    # ------------------------------------------------------------------ #
    #  Direction signal                                                    #
    # ------------------------------------------------------------------ #

    def predict_direction(self, indicators: pd.DataFrame) -> dict:
        """
        Derive a directional verdict from three independent signals:

          1. RSI regime
             • RSI < 40  → bullish impulse (oversold)
             • RSI > 60  → bearish impulse (overbought)
             • else      → neutral

          2. MACD crossover
             • MACD_Line > Signal_Line  → bullish
             • MACD_Line < Signal_Line  → bearish

          3. Bollinger Band position
             • Close < BB_Mid           → below midline → bearish bias
             • Close > BB_Mid           → above midline → bullish bias

        Each signal contributes a score in {−1, 0, +1}.
        Raw score ∈ [−3, +3].

        Confidence calibration:
          raw_score maps to a [0.45, 0.85] probability band via min-max
          scaling so we never claim certainty — markets are stochastic.
          Neutral band (score = 0) → confidence = 0.50.
        """
        last      = indicators.iloc[-1]
        close     = last["Close"]
        rsi_val   = last["RSI"]
        macd_line = last["MACD"]
        signal    = last["Signal"]
        bb_mid    = last["BB_Mid"]

        # --- Signal scoring ------------------------------------------- #
        score = 0

        # 1. RSI
        if rsi_val < 40:
            score += 1    # oversold → bullish
        elif rsi_val > 60:
            score -= 1    # overbought → bearish

        # 2. MACD crossover
        if macd_line > signal:
            score += 1
        elif macd_line < signal:
            score -= 1

        # 3. BB midline position
        if close > bb_mid:
            score += 1
        elif close < bb_mid:
            score -= 1

        # --- Verdict -------------------------------------------------- #
        if score >= 2:
            verdict = "BULLISH"
        elif score <= -2:
            verdict = "BEARISH"
        else:
            verdict = "NEUTRAL"

        # --- Confidence calibration ------------------------------------ #
        # Map raw_score ∈ [-3, +3] to [0.45, 0.85]
        # abs(score) drives distance from 0.50 (max uncertainty)
        abs_score  = abs(score)
        # Linear interpolation: 0 → 0.50, 3 → 0.85
        confidence = 0.50 + (abs_score / 3) * 0.35
        # If verdict is NEUTRAL, cap at 0.55 — we're not very sure
        if verdict == "NEUTRAL":
            confidence = min(confidence, 0.55)

        return {
            "verdict":    verdict,
            "confidence": round(confidence, 3),
            "score":      score,
            "signals": {
                "rsi":  "bullish" if rsi_val < 40 else ("bearish" if rsi_val > 60 else "neutral"),
                "macd": "bullish" if macd_line > signal else "bearish",
                "bb":   "bullish" if close > bb_mid else "bearish",
            }
        }

    # ------------------------------------------------------------------ #
    #  Volatility classification                                           #
    # ------------------------------------------------------------------ #

    @staticmethod
    def classify_volatility(atr_pct: float) -> str:
        """
        Map ATR-as-%-of-price to a human-readable volatility label.
        """
        if atr_pct > settings.VOL_HIGH_THRESHOLD:
            return "HIGH"
        elif atr_pct < settings.VOL_LOW_THRESHOLD:
            return "LOW"
        return "MODERATE"

    # ------------------------------------------------------------------ #
    #  Main public entry point                                             #
    # ------------------------------------------------------------------ #

    def analyze(self) -> AnalysisResult:
        """
        Fetch data, compute all indicators, derive support/resistance,
        volatility label, and directional verdict.

        Returns an AnalysisResult dataclass.
        """
        self.fetch()
        indicators = self.calculate_indicators()
        last       = indicators.iloc[-1]

        support    = round(float(last["BB_Lower"]), 4)
        resistance = round(float(last["BB_Upper"]), 4)
        atr_pct    = float(last["ATR_Pct"])
        volatility = self.classify_volatility(atr_pct)
        direction  = self.predict_direction(indicators)

        return AnalysisResult(
            ticker        = self.ticker,
            support       = support,
            resistance    = resistance,
            volatility    = volatility,
            verdict       = direction["verdict"],
            confidence    = direction["confidence"],
            current_price = round(float(last["Close"]), 4),
            indicators    = {
                "rsi":        round(float(last["RSI"]), 2),
                "macd":       round(float(last["MACD"]), 4),
                "macd_signal":round(float(last["Signal"]), 4),
                "atr":        round(float(last["ATR"]), 4),
                "atr_pct":    round(atr_pct, 2),
                "bb_upper":   resistance,
                "bb_lower":   support,
                "bb_mid":     round(float(last["BB_Mid"]), 4),
                "vol_ratio":  round(float(last["Vol_Ratio"]), 2),
                "signals":    direction["signals"],
            }
        )
