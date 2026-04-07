# packages/ml-engine/src/db/backtest_store.py

import json

from .duckdb_client import DuckDBClient


class BacktestStore:
    def __init__(self, db: DuckDBClient):
        self.db = db

    async def save_run(
        self,
        run_id: str,
        symbol: str,
        exchange: str,
        strategy: str,
        start_ts: str,
        end_ts: str,
        config: dict,
    ):
        sql = """
            INSERT INTO backtest_runs (id, symbol, exchange, strategy, start_ts, end_ts, config)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        await self.db.execute(
            sql, [run_id, symbol, exchange, strategy, start_ts, end_ts, json.dumps(config)]
        )

    async def save_metrics(self, run_id: str, metrics: dict):
        sql = """
            INSERT INTO backtest_metrics (run_id, sharpe, sortino, max_drawdown, win_rate, profit_factor, total_trades, equity_curve)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        await self.db.execute(
            sql,
            [
                run_id,
                metrics.get("sharpe"),
                metrics.get("sortino"),
                metrics.get("max_drawdown"),
                metrics.get("win_rate"),
                metrics.get("profit_factor"),
                metrics.get("total_trades"),
                json.dumps(metrics.get("equity_curve", [])),
            ],
        )
