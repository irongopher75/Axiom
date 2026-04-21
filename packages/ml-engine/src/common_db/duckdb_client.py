# packages/ml-engine/src/common_db/duckdb_client.py

import asyncio
import logging
import threading
from pathlib import Path

import duckdb
import pandas as pd

logger = logging.getLogger(__name__)


class DuckDBClient:
    """
    Thread-safe DuckDB client for the Sidecar.
    Maintains a single connection with a lock for all operations.
    """

    SCHEMA = """
        -- Predictions history
        CREATE TABLE IF NOT EXISTS predictions (
            id          VARCHAR PRIMARY KEY,
            symbol      VARCHAR NOT NULL,
            exchange    VARCHAR,
            ts          TIMESTAMPTZ,
            direction   VARCHAR,
            confidence  DOUBLE,
            regime      VARCHAR
        );

        -- Backtest runs
        CREATE TABLE IF NOT EXISTS backtest_runs (
            id          VARCHAR PRIMARY KEY,
            symbol      VARCHAR NOT NULL,
            strategy    VARCHAR NOT NULL,
            timestamp   TIMESTAMPTZ DEFAULT now(),
            config      JSON
        );

        -- Backtest metrics
        CREATE TABLE IF NOT EXISTS backtest_metrics (
            run_id      VARCHAR REFERENCES backtest_runs(id),
            metric      VARCHAR NOT NULL,
            value       DOUBLE NOT NULL
        );

        -- Backtest trades
        CREATE TABLE IF NOT EXISTS backtest_trades (
            run_id      VARCHAR REFERENCES backtest_runs(id),
            symbol      VARCHAR,
            entry_ts    TIMESTAMPTZ,
            exit_ts     TIMESTAMPTZ,
            entry_price DOUBLE,
            exit_price  DOUBLE,
            pnl         DOUBLE,
            pnl_pct     DOUBLE
        );

        -- Tick data (Local Cache)
        CREATE TABLE IF NOT EXISTS ticks (
            symbol      VARCHAR NOT NULL,
            ts          TIMESTAMPTZ NOT NULL,
            price       DOUBLE NOT NULL,
            volume      DOUBLE,
            source      VARCHAR
        );

        -- Paper trades (live/open and historical)
        CREATE TABLE IF NOT EXISTS trades (
            id              VARCHAR PRIMARY KEY,
            symbol          VARCHAR NOT NULL,
            side            VARCHAR NOT NULL,
            entry_price     DOUBLE NOT NULL,
            exit_price      DOUBLE,
            quantity        DOUBLE NOT NULL,
            status          VARCHAR NOT NULL, -- OPEN, CLOSED
            pnl             DOUBLE DEFAULT 0.0,
            strategy        VARCHAR,
            timestamp       TIMESTAMPTZ DEFAULT now(),
            exit_timestamp  TIMESTAMPTZ
        );

        -- User watchlist
        CREATE TABLE IF NOT EXISTS watchlist (
            symbol      VARCHAR PRIMARY KEY,
            added_at    TIMESTAMPTZ DEFAULT now()
        );

        -- Performance Indices
        CREATE INDEX IF NOT EXISTS idx_predictions_symbol ON predictions (symbol);
        CREATE INDEX IF NOT EXISTS idx_predictions_ts ON predictions (ts DESC);
        CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades (symbol);
        CREATE INDEX IF NOT EXISTS idx_trades_ts ON trades (timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_ticks_symbol ON ticks (symbol);
        CREATE INDEX IF NOT EXISTS idx_ticks_ts ON ticks (ts DESC);

        -- Vessel position history
        CREATE TABLE IF NOT EXISTS vessel_history (
            mmsi        INTEGER NOT NULL,
            ts          TIMESTAMPTZ NOT NULL,
            lat         DOUBLE NOT NULL,
            lon         DOUBLE NOT NULL,
            speed       DOUBLE,
            course      DOUBLE,
            ship_type   VARCHAR,
            geo_signal  VARCHAR
        );

        -- Users for notifications
        CREATE TABLE IF NOT EXISTS users (
            email       VARCHAR PRIMARY KEY,
            is_active   BOOLEAN DEFAULT TRUE,
            is_approved BOOLEAN DEFAULT FALSE,
            subscribed_to_news BOOLEAN DEFAULT TRUE,
            created_at  TIMESTAMPTZ DEFAULT now()
        );
    """

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._conn = None
        self._lock = threading.Lock()

    async def initialize(self):
        """Init connection and schema"""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        # Use a single connection for the whole app
        self._conn = duckdb.connect(str(self.db_path))
        self._conn.execute(self.SCHEMA)
        self._conn.execute(
            """
            ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE;
            ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_email VARCHAR;

            CREATE TABLE IF NOT EXISTS user_watchlists (
                user_email VARCHAR NOT NULL,
                symbol VARCHAR NOT NULL,
                added_at TIMESTAMPTZ DEFAULT now(),
                PRIMARY KEY (user_email, symbol)
            );

            CREATE INDEX IF NOT EXISTS idx_trades_user_email ON trades (user_email);
            CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_email ON user_watchlists (user_email);
            """
        )
        logger.info(f"DuckDB initialized at {self.db_path}")

    def query(self, sql: str, params: list | None = None) -> pd.DataFrame:
        """Synchronous query — thread-safe via lock."""
        if not self._conn:
            raise RuntimeError("DuckDBClient not initialized. Call initialize() first.")

        try:
            with self._lock:
                if params:
                    return self._conn.execute(sql, params).df()
                return self._conn.execute(sql).df()
        except Exception as e:
            logger.error(f"DuckDB query failed: {sql} | Error: {e}")
            raise

    async def execute(self, sql: str, params: list | None = None):
        """Async execute — offloads to thread to avoid blocking loop."""
        if not self._conn:
            raise RuntimeError("DuckDBClient not initialized. Call initialize() first.")

        def _exec():
            try:
                with self._lock:
                    if params:
                        self._conn.execute(sql, params)
                    else:
                        self._conn.execute(sql)
                    self._conn.commit()
            except Exception as e:
                logger.error(f"DuckDB execute failed: {sql} | Error: {e}")
                raise

        await asyncio.to_thread(_exec)

    async def close(self):
        """Shutdown"""
        if self._conn:
            self._conn.close()
            self._conn = None
