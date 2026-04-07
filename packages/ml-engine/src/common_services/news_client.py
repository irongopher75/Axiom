# packages/ml-engine/src/common_services.news_client.py
#
# This is the ONLY file in the sidecar that talks to cloud.
# Everything else is local.
# This connects to the shared MongoDB news database.

from collections.abc import AsyncIterator
from datetime import datetime

import motor.motor_asyncio


class NewsClient:
    """
    Reads news from the shared MongoDB Atlas instance.
    """

    def __init__(self, uri: str, db_name: str = "axiom_news"):
        self.uri = uri
        self.db_name = db_name
        self._client: motor.motor_asyncio.AsyncIOMotorClient | None = None
        self._db = None

    async def connect(self):
        if not self.uri:
            print("[NewsClient] No MongoDB URI provided, news feed disabled.", flush=True)
            return

        self._client = motor.motor_asyncio.AsyncIOMotorClient(
            self.uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
        self._db = self._client[self.db_name]
        # Verify connection — fail fast if MongoDB unreachable
        try:
            await self._client.admin.command("ping")
        except Exception as e:
            # Non-fatal — news is supplementary, not critical
            print(f"[NewsClient] MongoDB unreachable: {e}", flush=True)
            self._client = None

    async def get_recent(
        self,
        limit: int = 50,
        since: datetime | None = None,
    ) -> list[dict]:
        if not self._client:
            return []

        query = {}
        if since:
            query["ts"] = {"$gte": since}

        cursor = (
            self._db.news.find(
                query,
                projection={
                    "_id": 0,
                    "ts": 1,
                    "headline": 1,
                    "source": 1,
                    "sentiment": 1,
                    "severity": 1,
                    "entities": 1,
                    "url": 1,
                },
            )
            .sort("ts", -1)
            .limit(limit)
        )

        return await cursor.to_list(length=limit)

    async def stream(self) -> AsyncIterator[dict]:
        """
        Watch MongoDB change stream for new news items.
        """
        if not self._client:
            return

        async with self._db.news.watch(
            pipeline=[{"$match": {"operationType": "insert"}}],
            full_document="updateLookup",
        ) as stream:
            async for change in stream:
                doc = change.get("fullDocument", {})
                doc.pop("_id", None)
                yield doc

    async def disconnect(self):
        if self._client:
            self._client.close()
