# packages/ml-engine/src/common_db/duckdb_client.py

import duckdb
import pandas as pd
from pathlib import Path
from typing import Optional, List
import asyncio
import threading
import logging

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
        logger.info(f"DuckDB initialized at {self.db_path}")

    def query(self, sql: str, params: Optional[list] = None) -> pd.DataFrame:
        """Synchronous query — thread-safe via lock."""
        with self._lock:
            if params:
                return self._conn.execute(sql, params).df()
            return self._conn.execute(sql).df()

    async def execute(self, sql: str, params: Optional[list] = None):
        """Async execute — offloads to thread to avoid blocking loop."""
        def _exec():
            with self._lock:
                if params:
                    self._conn.execute(sql, params)
                else:
                    self._conn.execute(sql)
                self._conn.commit()

        await asyncio.to_thread(_exec)

    async def close(self):
        """Shutdown"""
        if self._conn:
            self._conn.close()
            self._conn = None
