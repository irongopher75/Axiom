# packages/ml-engine/src/routers/ai.py
# Adapted for Sidecar: Local-only, No Auth

from fastapi import APIRouter, HTTPException, Request
from ml_engine import MarketAnalyzer
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/analyze/{symbol}")
async def analyze_symbol(symbol: str):
    """Generates a technical/AI analysis report for a symbol."""
    symbol = symbol.upper()
    try:
        analyzer = MarketAnalyzer(symbol)
        await analyzer.fetch_data(period="1mo", interval="1h")
        
        # Simple rule-based "AI" report
        price = float(analyzer.data['Close'].iloc[-1])
        change = float(analyzer.data['Close'].iloc[-1] - analyzer.data['Close'].iloc[0])
        trend = "BULLISH" if change > 0 else "BEARISH"
        
        return {
            "symbol": symbol,
            "timestamp": datetime.now().isoformat(),
            "summary": f"AXIOM Intelligence indicates a {trend} outlook for {symbol} over the 30-day window.",
            "technicals": {
                "trend": trend,
                "volatility": "MODERATE",
                "support": round(price * 0.95, 2),
                "resistance": round(price * 1.05, 2)
            },
            "verdict": "ACCUMULATE" if trend == "BULLISH" else "AVOID",
            "confidence": 0.78
        }
    except Exception as e:
        logger.error(f"AI Analysis failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def ai_chat(body: dict):
    """Simple chat endpoint for terminal interaction."""
    user_msg = body.get("message", "").lower()
    
    if "price" in user_msg or "tell me about" in user_msg:
        return {"response": "I can analyze any ticker if you provide the symbol. Try 'Analyze AAPL'."}
    
    return {"response": "I am the AXIOM Sidecar Intelligence. I monitor your local data and provide technical insights."}
