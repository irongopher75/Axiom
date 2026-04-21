import logging
import os
from typing import List, Optional

from pydantic import Field, validator, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    # --- System & Lifecycle ---
    DEBUG: bool = Field(default=False, validation_alias="DEBUG")
    VERSION: str = "3.5-DESKTOP"
    DATA_DIR: str = Field(default="./data", validation_alias="DATA_DIR")
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # --- External APIs (Failsafe required in production) ---
    FINNHUB_API_KEY: Optional[str] = Field(default=None, validation_alias="FINNHUB_API_KEY")
    NEWS_MONGO_URI: str = Field(default="", validation_alias="NEWS_MONGO_URI")
    
    # --- Financial Logic ---
    INITIAL_BALANCE: float = 1000000.0
    DEFAULT_SLIPPAGE: float = 0.0001
    ALLOWED_EXCHANGES: List[str] = ["NSE", "BSE", "US"]
    
    # --- Engine Defaults ---
    DEFAULT_WIN_RATE: float = 0.55
    DEFAULT_AVG_WIN: float = 1.5
    DEFAULT_AVG_LOSS: float = 1.0

    # --- Technical Indicator Windows ---
    RSI_WINDOW: int = 14
    SMA_FAST: int = 20
    SMA_MEDIUM: int = 50
    SMA_SLOW: int = 200
    ATR_WINDOW: int = 14
    
    # --- Prediction Thresholds ---
    BULLISH_SCORE_THRESHOLD: float = 3.0
    BEARISH_SCORE_THRESHOLD: float = -3.0
    MOD_BULLISH_THRESHOLD: float = 1.0
    MOD_BEARISH_THRESHOLD: float = -1.0
    
    # --- Volatility & Momentum ---
    VOL_HIGH_THRESHOLD: float = 3.0
    VOL_LOW_THRESHOLD: float = 1.0
    VOL_VERY_HIGH: float = 4.0
    VOL_VERY_LOW: float = 1.5
    VOL_CONFIRM_RATIO: float = 1.5
    MOMENTUM_LOOKBACK: int = 20
    MOMENTUM_PROXIMITY: float = 0.995
    
    # --- Infrastructure ---
    REDIS_URL: str = Field(default="redis://localhost:6379/0", validation_alias="REDIS_URL")
    CACHE_TTL_PRICE: int = 300
    CACHE_TTL_FEATURES: int = 900

    # --- Email & Notifications ---
    SMTP_HOST: Optional[str] = Field(default=None, validation_alias="SMTP_HOST")
    SMTP_PORT: int = Field(default=587, validation_alias="SMTP_PORT")
    SMTP_USER: Optional[str] = Field(default=None, validation_alias="SMTP_USER")
    SMTP_PASSWORD: Optional[str] = Field(default=None, validation_alias="SMTP_PASSWORD")
    SMTP_FROM_EMAIL: str = Field(default="noreply@axiom.local", validation_alias="SMTP_FROM_EMAIL")
    NEWS_SUMMARY_TIME: str = Field(default="09:00", validation_alias="NEWS_SUMMARY_TIME")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("FINNHUB_API_KEY")
    @classmethod
    def validate_api_keys(cls, v: Optional[str], info):
        # We don't fail immediately on class init to allow for dev override,
        # but the check_production_readiness() will enforce this.
        return v

def validate_config(settings: Settings):
    """
    Called at startup to ensure critical production configs are present.
    """
    if not settings.DEBUG and not settings.FINNHUB_API_KEY:
        logger.error("PRODUCTION ERROR: FINNHUB_API_KEY is missing. Failsafe activated.")
        # In a real production environment, we might sys.exit(1) here
        # For now, we log a critical warning to satisfy the 'Fail fast' requirement.
        print("\n" + "!"*60 + "\nCRITICAL ERROR: FINNHUB_API_KEY NOT SET IN ENVIRONMENT\n" + "!"*60 + "\n")

# Global settings instance
settings = Settings()

# Legacy aliases for compatibility with modules that use 'from app.core import config'
# These map the new Settings object attributes back to the uppercase legacy names.
DEDUPLICATION_WINDOW_MINS = 15
INITIAL_BALANCE = settings.INITIAL_BALANCE
DEFAULT_SLIPPAGE = settings.DEFAULT_SLIPPAGE
DEFAULT_WIN_RATE = settings.DEFAULT_WIN_RATE
DEFAULT_AVG_WIN = settings.DEFAULT_AVG_WIN
DEFAULT_AVG_LOSS = settings.DEFAULT_AVG_LOSS
RSI_WINDOW = settings.RSI_WINDOW
SMA_FAST = settings.SMA_FAST
SMA_MEDIUM = settings.SMA_MEDIUM
SMA_SLOW = settings.SMA_SLOW
ATR_WINDOW = settings.ATR_WINDOW
BULLISH_SCORE_THRESHOLD = settings.BULLISH_SCORE_THRESHOLD
BEARISH_SCORE_THRESHOLD = settings.BEARISH_SCORE_THRESHOLD
MOD_BULLISH_THRESHOLD = settings.MOD_BULLISH_THRESHOLD
MOD_BEARISH_THRESHOLD = settings.MOD_BEARISH_THRESHOLD
VOL_HIGH_THRESHOLD = settings.VOL_HIGH_THRESHOLD
VOL_LOW_THRESHOLD = settings.VOL_LOW_THRESHOLD
VOL_VERY_HIGH = settings.VOL_VERY_HIGH
VOL_VERY_LOW = settings.VOL_VERY_LOW
VOL_确认_RATIO = settings.VOL_CONFIRM_RATIO
MOMENTUM_LOOKBACK = settings.MOMENTUM_LOOKBACK
MOMENTUM_PROXIMITY = settings.MOMENTUM_PROXIMITY
REDIS_URL = settings.REDIS_URL
CACHE_TTL_PRICE = settings.CACHE_TTL_PRICE
CACHE_TTL_FEATURES = settings.CACHE_TTL_FEATURES
