# packages/ml-engine/src/main.py
# Sidecar Entry Point — FastAPI
# Local-first architecture

import uvicorn
import argparse
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pathlib import Path
from datetime import datetime
import traceback
import logging

from common_db.duckdb_client import DuckDBClient
from common_services.news_client import NewsClient
from risk_engine import RiskEngine
from routers import predict, backtest, ai, users, trades, quotes, terminal, search, news

# ── Lifecycle ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DuckDB
    app.state.db = DuckDBClient(Path(app.state.data_dir) / 'axiom.duckdb')
    await app.state.db.initialize()

    # Initialize News Client (Cloud)
    app.state.news = NewsClient(app.state.news_uri)
    try:
        await app.state.news.connect()
    except Exception as e:
        print(f"News Client failed to connect: {e}")

    # Initialize Risk Engine
    app.state.risk = RiskEngine()

    print("AXIOM_READY", flush=True)
    yield
    await app.state.db.close()
    await app.state.news.disconnect()

app = FastAPI(title="AXIOM Sidecar", lifespan=lifespan)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"GLOBAL ERROR: {tb}", flush=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "traceback": tb},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ── Routers (Centrally Prefixed for consistency) ───────────────
app.include_router(predict.router, prefix="/api/v1/predict", tags=["ML"])
app.include_router(backtest.router, prefix="/api/v1/backtest", tags=["Backtest"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI Analyst"])
app.include_router(search.router, prefix="/api/v1/search", tags=["Search"])
app.include_router(news.router, prefix="/api/v1/news", tags=["News"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(trades.router, prefix="/api/v1/trades", tags=["Trades"])
app.include_router(quotes.router, prefix="/api/v1/quotes", tags=["Quotes"])
app.include_router(terminal.router, prefix="/api/v1/ws", tags=["Terminal WS"])

# ── Health ─────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# ── Legacy News WS (Keeping for backward compatibility) ────────
@app.websocket("/api/v1/ws/news")
async def news_feed_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        async for item in app.state.news.stream():
            await websocket.send_json(item)
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=18432)
    parser.add_argument("--data-dir", type=str, required=True)
    parser.add_argument("--news-uri", type=str, default="")
    parser.add_argument("--mode", type=str, default="sidecar")
    args = parser.parse_args()

    app.state.data_dir = args.data_dir
    app.state.news_uri = args.news_uri
    app.state.mode = args.mode

    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")
