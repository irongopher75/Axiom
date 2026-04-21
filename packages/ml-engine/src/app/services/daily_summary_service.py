import logging
from datetime import UTC, datetime, timedelta

from app.services.mail_service import mail_service
from app.services.news_service import news_service
from common_db.duckdb_client import DuckDBClient

logger = logging.getLogger(__name__)

class DailyNewsSummaryService:
    def __init__(self, db: DuckDBClient):
        self.db = db

    async def get_subscribed_users(self) -> list[str]:
        """Fetches all users subscribed to news updates."""
        try:
            df = self.db.query("SELECT email FROM users WHERE subscribed_to_news = TRUE AND is_active = TRUE")
            return df["email"].tolist() if not df.empty else []
        except Exception as e:
            logger.error(f"Failed to fetch subscribed users: {e}")
            return []

    async def generate_and_send_summary(self):
        """Fetches news from the previous day, formats, and sends to all subscribers."""
        logger.info("Starting scheduled daily news summary generation...")
        
        # 1. Fetch news (get_feed refreshes if needed)
        # We'll take a larger set and filter for "yesterday"
        all_news = await news_service.get_feed(limit=100)
        
        now = datetime.now(UTC)
        yesterday_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_end = yesterday_start + timedelta(days=1)
        
        # Filter for articles published yesterday
        yesterday_news = [
            item for item in all_news 
            if yesterday_start.timestamp() <= item.get("published_at", 0) < yesterday_end.timestamp()
        ]
        
        # Sort by severity score (importance)
        yesterday_news.sort(key=lambda x: x.get("severity_score", 0), reverse=True)
        
        # Limit to 15 topics as requested
        top_news = yesterday_news[:15]
        
        if not top_news:
            logger.info("No news found for the previous day. Skipping summary email.")
            return

        # 2. Get recipients
        recipients = await self.get_subscribed_users()
        if not recipients:
            logger.info("No subscribed users found. Skipping summary email.")
            return

        # 3. Send email
        report_date = yesterday_start.strftime("%B %d, %Y")
        await mail_service.send_email(
            subject=f"Axiom Daily Intelligence Briefing - {report_date}",
            recipients=recipients,
            template_name="news_summary.html",
            context={
                "report_date": report_date,
                "news_items": top_news
            }
        )
        logger.info(f"Daily news summary sent to {len(recipients)} users.")

# No singleton here as it needs DB instance which is available in main.py lifespan
