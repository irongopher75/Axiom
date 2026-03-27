# packages/ml-engine/src/routers/news.py
# Sidecar: Local News Feed (Mock or Cloud-backed)

from fastapi import APIRouter, Request, Query
from typing import List
import logging
from datetime import datetime

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
            "category": "MARKET"
        },
        {
            "id": "news-2",
            "title": "Oil Prices Stabilize Amid Geopolitical Tension",
            "source": "Reuters",
            "timestamp": datetime.now().isoformat(),
            "sentiment": "NEUTRAL",
            "category": "COMMODITIES"
        }
    ]
