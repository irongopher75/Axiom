import asyncio
import os
import sqlite3
import ssl

import aiohttp
import certifi

# Configuration
EXCHANGES = [
    "NYSE",
    "NASDAQ",
    "BSE",
    "NSE",
    "LSE",
    "TSE",
    "SSE",
    "HKEX",
    "TSX",
    "ASX",
    "EURONEXT",
    "XETRA",
]

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DB_PATH = os.path.join(DATA_DIR, "symbols.db")


class SymbolHarvester:
    """
    Optimized harvester for global stock symbols.
    Uses aiohttp for parallel fetching and batch DB insertions.
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("TWELVEDATA_API_KEY")
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)

    def init_db(self):
        """Initializes the SQLite database with FTS5 virtual table for lightning-fast search."""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Primary storage table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS symbols (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                name TEXT,
                currency TEXT,
                exchange TEXT NOT NULL,
                mic_code TEXT,
                country TEXT,
                type TEXT,
                UNIQUE(symbol, exchange)
            )
        """)

        # FTS5 Virtual Table for fuzzy search
        try:
            cursor.execute(
                "CREATE VIRTUAL TABLE IF NOT EXISTS symbols_fts USING fts5(symbol, name, exchange, content='symbols', content_rowid='id')"
            )
            # Triggers to keep FTS table in sync
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS symbols_ai AFTER INSERT ON symbols BEGIN
                  INSERT INTO symbols_fts(rowid, symbol, name, exchange) VALUES (new.id, new.symbol, new.name, new.exchange);
                END;
            """)
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS symbols_ad AFTER DELETE ON symbols BEGIN
                  INSERT INTO symbols_fts(symbols_fts, rowid, symbol, name, exchange) VALUES('delete', old.id, old.symbol, old.name, old.exchange);
                END;
            """)
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS symbols_au AFTER UPDATE ON symbols BEGIN
                  INSERT INTO symbols_fts(symbols_fts, rowid, symbol, name, exchange) VALUES('delete', old.id, old.symbol, old.name, old.exchange);
                  INSERT INTO symbols_fts(rowid, symbol, name, exchange) VALUES (new.id, new.symbol, new.name, new.exchange);
                END;
            """)
        except sqlite3.OperationalError as e:
            print(f"FTS5 might not be supported in this SQLite: {e}")

        conn.commit()
        conn.close()

    async def fetch_exchange(self, session: aiohttp.ClientSession, exchange: str) -> list[dict]:
        if not self.api_key:
            print(f"Skipping {exchange} (No API Key)")
            return []

        url = f"https://api.twelvedata.com/stocks?exchange={exchange}&apikey={self.api_key}"
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    stocks = data.get("data", [])
                    print(f"Fetched {len(stocks)} symbols for {exchange}")
                    return stocks
                else:
                    text = await response.text()
                    print(f"Error fetching {exchange}: {response.status} - {text}")
                    return []
        except Exception as e:
            print(f"Exception fetching {exchange}: {e}")
            return []

    def save_batch(self, stocks: list[dict], exchange: str):
        """Optimized batch insertion using executemany."""
        if not stocks:
            return

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        batch_data = [
            (
                s.get("symbol"),
                s.get("name"),
                s.get("currency"),
                exchange,
                s.get("mic_code"),
                s.get("country"),
                s.get("type"),
            )
            for s in stocks
        ]

        cursor.executemany(
            """
            INSERT OR REPLACE INTO symbols (symbol, name, currency, exchange, mic_code, country, type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            batch_data,
        )

        conn.commit()
        conn.close()

    async def harvest_all(self):
        self.init_db()
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        async with aiohttp.ClientSession(
            connector=aiohttp.TCPConnector(ssl=ssl_context)
        ) as session:
            tasks = [self.fetch_exchange(session, ex) for ex in EXCHANGES]
            results = await asyncio.gather(*tasks)

            for exchange, stocks in zip(EXCHANGES, results):
                if stocks:
                    print(f"Saving {len(stocks)} stocks for {exchange}...")
                    self.save_batch(stocks, exchange)

        print(f"Optimized harvesting complete. DB at {DB_PATH}")


if __name__ == "__main__":
    harvester = SymbolHarvester()
    asyncio.run(harvester.harvest_all())
