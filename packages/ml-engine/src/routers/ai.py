# packages/ml-engine/src/routers/ai.py
# Adapted for Sidecar: Local-only, No Auth

import logging
from datetime import datetime

from app.services.ml_engine import MarketAnalyzer
from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter()
logger = logging.getLogger(__name__)



class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symbol: str = Field(..., pattern=r"^[A-Z0-9.-]{1,20}$")
    period: str = Field("1mo", pattern=r"^\d+(d|mo|y)$")
    interval: str = Field("1h", pattern=r"^\d+(m|h|d|wk|mo)$")


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(..., min_length=1, max_length=500)


@router.get("/analyze/{symbol}")
async def analyze_symbol(
    symbol: str = Path(..., pattern=r"^[A-Z0-9.-]{1,20}$"),
    period: str = Query("1mo", pattern=r"^\d+(d|mo|y)$"),
    interval: str = Query("1h", pattern=r"^\d+(m|h|d|wk|mo)$"),
):
    """Generates a technical/AI analysis report for a symbol."""
    symbol = symbol.upper()
    try:
        analyzer = MarketAnalyzer(symbol)
        await analyzer.fetch_data(period=period, interval=interval)

        if analyzer.data is None or analyzer.data.empty:
             raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        # Simple rule-based "AI" report
        price = float(analyzer.data["Close"].iloc[-1])
        change = float(analyzer.data["Close"].iloc[-1] - analyzer.data["Close"].iloc[0])
        trend = "BULLISH" if change > 0 else "BEARISH"

        return {
            "symbol": symbol,
            "timestamp": datetime.now().isoformat(),
            "summary": f"AXIOM Intelligence indicates a {trend} outlook for {symbol} over the requested window.",
            "technicals": {
                "trend": trend,
                "volatility": "MODERATE",
                "support": round(price * 0.95, 2),
                "resistance": round(price * 1.05, 2),
            },
            "verdict": "ACCUMULATE" if trend == "BULLISH" else "AVOID",
            "confidence": 0.78,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI Analysis failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="An error occurred during analysis.")


@router.post("/chat")
async def ai_chat(body: ChatRequest):
    """Simple chat endpoint for terminal interaction."""
    user_msg = body.message.lower()

    if "price" in user_msg or "tell me about" in user_msg:
        return {
            "response": "I can analyze any ticker if you provide the symbol. Try 'Analyze AAPL'."
        }

    return {
        "response": "I am the AXIOM Sidecar Intelligence. I monitor your local data and provide technical insights."
    }
