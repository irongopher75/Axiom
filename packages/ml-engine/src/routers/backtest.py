# packages/ml-engine/src/routers/backtest.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

import logging
import uuid

from backtester import VectorizedBacktester
from fastapi import APIRouter, HTTPException, Request

from pydantic import BaseModel, ConfigDict, Field

router = APIRouter()
logger = logging.getLogger(__name__)


class BacktestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symbol: str = Field(..., pattern=r"^[A-Z0-9.-]{1,20}$")
    period: str = Field("1y", pattern=r"^\d+(d|mo|y)$")
    interval: str = Field("1d", pattern=r"^\d+(m|h|d|wk|mo)$")
    initial_capital: float = Field(100000.0, gt=0)


@router.post("/run")
async def run_backtest(
    request: Request,
    body: BacktestRequest,
):
    symbol = body.symbol.upper()
    db = request.app.state.db
    run_id = str(uuid.uuid4())

    try:
        bt = VectorizedBacktester(symbol, initial_capital=body.initial_capital)
        # VectorizedBacktester.run handles its own offloading to asyncio.to_thread
        result = await bt.run(period=body.period, interval=body.interval)

        # Save run and metrics to DuckDB
        sql_run = "INSERT INTO backtest_runs (id, symbol, exchange, strategy) VALUES (?, ?, ?, ?)"
        await db.execute(sql_run, [run_id, symbol, "US", "COMPOSITE"])

        sql_metrics = """
            INSERT INTO backtest_metrics (run_id, metric, value)
            VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)
        """
        # Save individual metrics to match the KVP schema
        await db.execute(
            sql_metrics,
            [
                run_id, "sharpe", result["sharpe_ratio"],
                run_id, "max_drawdown", result["max_drawdown"],
                run_id, "win_rate", result["win_rate"]
            ],
        )

        return {"id": run_id, "metrics": result}

    except Exception as e:
        logger.error(f"Backtest error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail="Backtest execution failed.")


@router.get("/history")
async def get_backtest_history(request: Request):
    db = request.app.state.db
    # Note: duckdb_client schema uses 'timestamp' for backtest_runs
    df = db.query("""
        SELECT r.*
        FROM backtest_runs r 
        ORDER BY r.timestamp DESC LIMIT 20
    """)
    return df.to_dict(orient="records")


@router.get("/{run_id}")
async def get_backtest_result(request: Request, run_id: str):
    db = request.app.state.db
    df = db.query("SELECT * FROM backtest_metrics WHERE run_id = ?", [run_id])
    if df.empty:
        raise HTTPException(status_code=404, detail="Run not found")
    return df.to_dict(orient="records")
