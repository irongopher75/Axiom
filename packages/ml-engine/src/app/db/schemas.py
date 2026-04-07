from typing import Annotated

from pydantic import BaseModel, BeforeValidator, EmailStr

# Helper to convert ObjectId to str
StrId = Annotated[str, BeforeValidator(str)]


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: StrId | None = None
    is_active: bool
    is_superuser: bool
    is_approved: bool
    watchlist: list[str] = []

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: str | None = None


class PredictionResult(BaseModel):
    prediction: str
    confidence: float
    rsi: float
    macd: float
    sma_20: float
    sma_50: float
    sma_200: float
    bb_upper: float
    bb_lower: float
    current_price: float
    strategy: str
    reasoning: str
    poc: float | None = None
    vol_ratio: float
    strike: float | None = None
    option_type: str | None = None
    payoff_graph: list[dict]


class ManualTradeRequest(BaseModel):
    symbol: str
    side: str  # BUY/SELL
    quantity: float
    price: float
