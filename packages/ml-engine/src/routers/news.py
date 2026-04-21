# packages/ml-engine/src/routers/news.py
# Sidecar: Local News Feed (Mock or Cloud-backed)

import logging
from datetime import datetime

from fastapi import APIRouter, Request, HTTPException
from app.services.daily_summary_service import DailyNewsSummaryService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/feed")
async def get_news_feed(limit: int = 60):
    """Returns a list of recent news items."""
    # In a real sidecar, this would fetch from a cache or the cloud
    return [
        {
            "id": "news-1",
            "title": "Global Markets Rally on Fed Pivot Hopes",
            "source": "AXIOM News",
            "timestamp": datetime.now().isoformat(),
            "sentiment": "BULLISH",
            "category": "MARKET",
        },
        {
            "id": "news-2",
            "title": "Oil Prices Stabilize Amid Geopolitical Tension",
            "source": "Reuters",
            "timestamp": datetime.now().isoformat(),
            "sentiment": "NEUTRAL",
            "category": "COMMODITIES",
        },
    ]

@router.post("/test-summary")
async def trigger_daily_summary(request: Request):
    """Manually trigger the daily news summary email for testing."""
    summary_service = DailyNewsSummaryService(request.app.state.db)
    try:
        await summary_service.generate_and_send_summary()
        return {"status": "Summary generation triggered. Check logs/email."}
    except Exception as e:
        logger.error(f"Manual summary trigger failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
