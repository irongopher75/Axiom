import logging
import os

import aiosqlite

logger = logging.getLogger(__name__)

# Constants
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DB_PATH = os.path.normpath(os.path.join(DATA_DIR, "symbols.db"))


class SymbolsManager:
    """
    Service to manage and query global stock symbols from a local SQLite database.
    Supports asynchronous querying with aiosqlite.
    """

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)

    async def init_db(self):
        """Initialize the symbols table and FTS5 virtual table if they don't exist."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
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
                await db.execute(
                    "CREATE VIRTUAL TABLE IF NOT EXISTS symbols_fts USING fts5(symbol, name, exchange, content='symbols', content_rowid='id')"
                )
                # Add triggers if missing (idempotent because of AFTER INSERT ON symbols ...)
                await db.execute("""
                    CREATE TRIGGER IF NOT EXISTS symbols_ai AFTER INSERT ON symbols BEGIN
                      INSERT INTO symbols_fts(rowid, symbol, name, exchange) VALUES (new.id, new.symbol, new.name, new.exchange);
                    END;
                """)
            except Exception as e:
                print(f"FTS5 might not be supported in this SQLite: {e}")

            await db.commit()

    async def search_symbols(
        self, query: str, exchange: str | None = None, limit: int = 50
    ) -> list[dict]:
        """Search for symbols by name or ticker using FTS5 fuzzy search."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row

                # Sanitize query: Remove special FTS5 characters to prevent injection/errors
                clean_query = query.replace('"', '').replace('*', '').replace(':', '').strip()
                if not clean_query:
                    return []
                    
                # query + "*" allows for prefix matching e.g. "apl" matches "AAPL"
                fts_query = f"{clean_query}*"

                sql = """
                    SELECT s.* 
                    FROM symbols s
                    JOIN symbols_fts f ON s.id = f.rowid
                    WHERE symbols_fts MATCH ?
                """
                params = [fts_query]

                if exchange:
                    sql += " AND s.exchange = ?"
                    params.append(exchange)

                sql += " ORDER BY rank LIMIT ?"
                params.append(limit)

                async with db.execute(sql, params) as cursor:
                    rows = await cursor.fetchall()
                    return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Symbol search failed for '{query}': {e}")
            return []

    async def get_all_exchanges(self) -> list[str]:
        """Returns a unique list of exchanges in the database."""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT DISTINCT exchange FROM symbols ORDER BY exchange"
            ) as cursor:
                rows = await cursor.fetchall()
                return [row[0] for row in rows]

    async def count_symbols(self, exchange: str | None = None) -> int:
        """Count the total number of symbols, optionally filtered by exchange."""
        async with aiosqlite.connect(self.db_path) as db:
            sql = "SELECT COUNT(*) FROM symbols"
            params = []
            if exchange:
                sql += " WHERE exchange = ?"
                params.append(exchange)
            async with db.execute(sql, params) as cursor:
                row = await cursor.fetchone()
                return row[0] if row else 0

    async def add_symbols_bulk(self, stocks: list[dict]):
        """Bulk add symbols to the database."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.executemany(
                """
                INSERT OR REPLACE INTO symbols (symbol, name, currency, exchange, mic_code, country, type)
                VALUES (:symbol, :name, :currency, :exchange, :mic_code, :country, :type)
            """,
                stocks,
            )
            await db.commit()
