"""
AI Router — /api/v1/ai
Provides dynamic market analysis and NLP-driven chat using
pure mathematical indicators (no ML libraries).
"""

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from cachetools import TTLCache
from textblob import TextBlob
from pydantic import BaseModel
import re
import logging

from market_analyzer import MarketAnalyzer

logger   = logging.getLogger(__name__)
# Removed prefix because main.py already does app.include_router(..., prefix="/api/v1/ai")
router   = APIRouter()
limiter  = Limiter(key_func=get_remote_address)

# Cache: ticker → AnalysisResult, TTL = 5 minutes (300 seconds)
_analysis_cache: TTLCache = TTLCache(maxsize=256, ttl=300)


# ------------------------------------------------------------------ #
#  Helpers                                                             #
# ------------------------------------------------------------------ #

def _extract_ticker(text: str) -> str | None:
    """
    Extract a stock ticker from free-form text using a simple regex.
    Matches 1–5 uppercase letters preceded by $ or surrounded by
    word boundaries.

    Examples:
      "What about $AAPL?"   → "AAPL"
      "tell me about TSLA"  → "TSLA"
      "how is Apple doing"  → None
    """
    # Dollar-sign prefix first (highest confidence)
    m = re.search(r'\$([A-Z]{1,5})\b', text.upper())
    if m:
        return m.group(1)
    # Bare uppercase word 1–5 chars
    m = re.search(r'\b([A-Z]{1,5})\b', text.upper())
    if m:
        # Exclude common English words that look like tickers
        _stopwords = {"A", "I", "THE", "FOR", "AT", "IS", "IN", "ON",
                      "OR", "OF", "BE", "DO", "GO", "NO", "SO", "TO",
                      "UP", "US", "WE", "AI", "OK", "BY", "IF", "IT"}
        candidate = m.group(1)
        if candidate not in _stopwords:
            return candidate
    return None


def _cached_analyze(ticker: str) -> dict:
    """Return cached analysis or fetch fresh."""
    if ticker in _analysis_cache:
        return _analysis_cache[ticker]
    result = MarketAnalyzer(ticker).analyze()
    payload = {
        "ticker":       result.ticker,
        "current_price":result.current_price,
        "support":      result.support,
        "resistance":   result.resistance,
        "volatility":   result.volatility,
        "verdict":      result.verdict,
        "confidence":   result.confidence,
        "indicators":   result.indicators,
    }
    _analysis_cache[ticker] = payload
    return payload


# ------------------------------------------------------------------ #
#  Models                                                              #
# ------------------------------------------------------------------ #

class ChatRequest(BaseModel):
    message: str


# ------------------------------------------------------------------ #
#  /analyze/{ticker}                                                   #
# ------------------------------------------------------------------ #

@router.get("/analyze/{ticker}")
@limiter.limit("10/minute")
async def analyze(ticker: str, request: Request):
    """
    Dynamic market analysis for a given ticker.

    Returns:
      • support    — Bollinger Band lower (BB_Lower)
      • resistance — Bollinger Band upper (BB_Upper)
      • volatility — ATR% mapped to LOW / MODERATE / HIGH
      • verdict    — RSI + MACD + BB position composite signal
      • confidence — calibrated 0.45–0.85 probability
    """
    ticker = ticker.upper().strip()
    if not re.match(r'^[A-Z]{1,5}$', ticker):
        raise HTTPException(status_code=400, detail="Invalid ticker symbol")

    try:
        return _cached_analyze(ticker)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Analysis failed for %s", ticker)
        raise HTTPException(status_code=500,
                            detail=f"Analysis error: {exc}")


# ------------------------------------------------------------------ #
#  /chat                                                               #
# ------------------------------------------------------------------ #

@router.post("/chat")
@limiter.limit("10/minute")
async def chat(body: ChatRequest, request: Request):
    """
    NLP chat endpoint.

    Flow:
      1. TextBlob sentiment on the incoming message.
      2. Regex ticker extraction.
      3. If ticker found → run MarketAnalyzer and synthesise a reply.
      4. If no ticker    → return a sentiment-aware generic response.
    """
    user_msg = body.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Empty message")

    # --- Sentiment -------------------------------------------------- #
    blob      = TextBlob(user_msg)
    polarity  = blob.sentiment.polarity       # −1 (negative) to +1 (positive)
    subjectivity = blob.sentiment.subjectivity

    sentiment_label = (
        "positive" if polarity > 0.1
        else "negative" if polarity < -0.1
        else "neutral"
    )

    # --- Ticker intent ---------------------------------------------- #
    ticker = _extract_ticker(user_msg)

    if ticker:
        try:
            data = _cached_analyze(ticker)
        except Exception as exc:
            return {
                "reply": (
                    f"I wasn't able to retrieve data for **{ticker}** right now "
                    f"({exc}). Please verify the ticker and try again."
                ),
                "sentiment": sentiment_label,
                "ticker": ticker,
            }

        verdict    = data["verdict"]
        confidence = data["confidence"]
        volatility = data["volatility"]
        price      = data["current_price"]
        support    = data["support"]
        resistance = data["resistance"]
        rsi        = data["indicators"]["rsi"]
        atr_pct    = data["indicators"]["atr_pct"]

        # Compose a natural-language reply from live indicator values
        reply = (
            f"**{ticker}** is currently trading at **${price:,.2f}**.\n\n"
            f"My mathematical analysis shows a **{verdict}** signal "
            f"with {confidence*100:.0f}% confidence.\n\n"
            f"• **Support** (BB Lower): ${support:,.2f}\n"
            f"• **Resistance** (BB Upper): ${resistance:,.2f}\n"
            f"• **Volatility**: {volatility} "
            f"(ATR = {atr_pct:.1f}% of price)\n"
            f"• **RSI ({data['indicators']['rsi']})**"
            f": {'oversold — watch for a bounce' if rsi < 30 else 'overbought — caution' if rsi > 70 else 'neutral zone'}\n\n"
        )

        # Colour commentary based on user sentiment
        if sentiment_label == "positive":
            reply += (
                "Your message reads optimistically. Keep in mind that "
                "Bollinger Bands measure recent volatility range — strong "
                "closes above resistance signal momentum continuation."
            )
        elif sentiment_label == "negative":
            reply += (
                "Your message reads cautiously. If price breaks below "
                f"${support:,.2f} on volume, that confirms the bearish bias."
            )
        else:
            reply += (
                "No strong emotional bias detected in your message — "
                "a good mindset for objective analysis."
            )

        return {
            "reply":      reply,
            "sentiment":  sentiment_label,
            "polarity":   round(polarity, 3),
            "ticker":     ticker,
            "analysis":   data,
        }

    # --- No ticker detected ----------------------------------------- #
    else:
        generic_replies = {
            "positive": (
                "Sounds like you're feeling good about the market! "
                "Try asking me about a specific ticker — e.g. 'analyse $AAPL'."
            ),
            "negative": (
                "Market stress is real. If you share a specific ticker "
                "I can run a full support/resistance analysis for you."
            ),
            "neutral": (
                "I can analyse any stock using Bollinger Bands, RSI, MACD, "
                "and ATR. Just mention a ticker like $TSLA or $NVDA."
            ),
        }
        return {
            "reply":     generic_replies[sentiment_label],
            "sentiment": sentiment_label,
            "polarity":  round(polarity, 3),
            "ticker":    None,
        }
