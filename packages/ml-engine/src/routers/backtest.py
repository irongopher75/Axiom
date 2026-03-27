# packages/ml-engine/src/routers/backtest.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

from fastapi import APIRouter, HTTPException, Request
from backtester import VectorizedBacktester
import uuid
import logging
from typing import List

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/run")
async def run_backtest(
    request: Request,
    symbol: str, 
    period: str = "1y", 
    interval: str = "1d", 
    initial_capital: float = 100000
):
    db = request.app.state.db
    run_id = str(uuid.uuid4())
    
    try:
        bt = VectorizedBacktester(symbol, initial_capital=initial_capital)
        result = await bt.run(period=period, interval=interval)
        
        # Save run and metrics to DuckDB
        sql_run = "INSERT INTO backtest_runs (id, symbol, exchange, strategy, start_ts, end_ts) VALUES (?, ?, ?, ?, ?, ?)"
        await db.execute(sql_run, [run_id, symbol, "US", "COMPOSITE", None, None])
        
        sql_metrics = """
            INSERT INTO backtest_metrics (run_id, sharpe, max_drawdown, win_rate, total_trades)
            VALUES (?, ?, ?, ?, ?)
        """
        await db.execute(sql_metrics, [
            run_id, 
            result['sharpe_ratio'], 
            result['max_drawdown'], 
            result['win_rate'], 
            len(result['equity_curve']) # Proxy for trades
        ])
        
        return { "id": run_id, "metrics": result }
        
    except Exception as e:
        logger.error(f"Backtest error for {symbol}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_backtest_history(request: Request):
    db = request.app.state.db
    df = db.query("""
        SELECT r.*, m.sharpe, m.win_rate 
        FROM backtest_runs r 
        LEFT JOIN backtest_metrics m ON r.id = m.run_id 
        ORDER BY r.created_at DESC LIMIT 20
    """)
    return df.to_dict(orient='records')

@router.get("/{run_id}")
async def get_backtest_result(request: Request, run_id: str):
    db = request.app.state.db
    df = db.query("SELECT * FROM backtest_metrics WHERE run_id = ?", [run_id])
    if df.empty:
        raise HTTPException(status_code=404, detail="Run not found")
    return df.iloc[0].to_dict()
