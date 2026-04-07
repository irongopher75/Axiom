# packages/ml-engine/src/db/tick_store.py

import pandas as pd

from .duckdb_client import DuckDBClient


class TickStore:
    def __init__(self, db: DuckDBClient):
        self.db = db

    async def save_ticks(self, df: pd.DataFrame):
        await self.db.insert_df("ticks", df)

    def get_history(self, symbol: str, limit: int = 1000):
        sql = "SELECT * FROM ticks WHERE symbol = ? ORDER BY ts DESC LIMIT ?"
        return self.db.query(sql, [symbol, limit])
