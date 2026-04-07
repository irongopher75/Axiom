from datetime import UTC, datetime

from beanie import Document
from pydantic import Field


class User(Document):
    email: str
    hashed_password: str
    is_active: bool = True
    is_superuser: bool = False
    is_approved: bool = False
    watchlist: list[str] = []  # User's personalized stock list

    class Settings:
        name = "users"


class PredictionLog(Document):
    symbol: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    current_price: float
    predicted_direction: str
    confidence_score: float
    suggested_strategy: str
    user_id: str  # Reference to User ID

    class Settings:
        name = "prediction_logs"


class Trade(Document):
    symbol: str
    user_id: str
    side: str  # BUY/SELL (from OrderSide constant)
    quantity: float
    entry_price: float
    exit_price: float | None = None
    status: str = "OPEN"  # OPEN/CLOSED (from OrderStatus constant)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    exit_timestamp: datetime | None = None
    pnl: float = 0.0
    strategy: str | None = "MANUAL"
    current_price: float | None = None

    class Settings:
        name = "trades"


class BacktestRun(Document):
    symbol: str
    user_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    period: str
    interval: str
    metrics: dict
    equity_curve: list
    config: dict

    class Settings:
        name = "backtest_runs"


class RegimeLog(Document):
    symbol: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    regime: str
    score: float
    volatility: float

    class Settings:
        name = "regime_logs"
