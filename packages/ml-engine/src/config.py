import os
from pathlib import Path

# packages/ml-engine/src/config.py
# Sidecar Configuration Values — Environment Aware

DEDUPLICATION_WINDOW_MINS = int(os.getenv("DEDUPLICATION_WINDOW_MINS", 5))
INITIAL_BALANCE = float(os.getenv("INITIAL_BALANCE", 100000.0))
ALLOWED_EXCHANGES = os.getenv("ALLOWED_EXCHANGES", "NSE,BSE,US").split(",")
VERSION = os.getenv("VERSION", "3.5-DESKTOP")

# --- Financial Defaults ---
DEFAULT_SLIPPAGE = float(os.getenv("DEFAULT_SLIPPAGE", 0.0001))
DEFAULT_WIN_RATE = 0.55
DEFAULT_AVG_WIN = 1.5
DEFAULT_AVG_LOSS = 1.0

# --- Technical Indicator Windows ---
RSI_WINDOW = int(os.getenv("RSI_WINDOW", 14))
SMA_FAST = int(os.getenv("SMA_FAST", 20))
SMA_MEDIUM = int(os.getenv("SMA_MEDIUM", 50))
SMA_SLOW = int(os.getenv("SMA_SLOW", 200))
ATR_WINDOW = int(os.getenv("ATR_WINDOW", 14))

# --- Prediction Thresholds ---
BULLISH_SCORE_THRESHOLD = 3.0
BEARISH_SCORE_THRESHOLD = -3.0
MOD_BULLISH_THRESHOLD = 1.0
MOD_BEARISH_THRESHOLD = -1.0

# --- Volatility Adaptation ---
VOL_HIGH_THRESHOLD = 3.0
VOL_LOW_THRESHOLD = 1.0

# --- Momentum parameters ---
MOMENTUM_LOOKBACK = 20
MOMENTUM_PROXIMITY = 0.98

# --- Cache ---
CACHE_TTL_PRICE = 300
CACHE_TTL_FEATURES = 900
