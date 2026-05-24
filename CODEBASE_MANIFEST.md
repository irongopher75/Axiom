# AXIOM Codebase Manifest

This document provides a simplified inventory of the Axiom project files and a historical log of the project's evolution.

## 1. Project Inventory

| File Path | Function (Least Words) | Content Summary |
| :--- | :--- | :--- |
| `packages/ml-engine/src/main.py` | FastAPI Sidecar Entry | Sets up lifespan, global error handling, and all API routes. |
| `packages/ml-engine/src/common_db/duckdb_client.py` | DuckDB Analytics Client | Thread-safe class for caching ticks, trades, and predictions. |
| `packages/ml-engine/src/common_services/symbols_manager.py` | Global Search Manager | Async SQLite FTS5 client for fuzzy-searching ticker symbols. |
| `packages/ml-engine/src/app/services/ml_engine.py` | Core ML Analysis Engine | MarketAnalyzer class with vectorized indicators and caching. |
| `packages/ml-engine/src/routers/ai.py` | AI Analysis Endpoints | POST/GET routes for technical reports and LLM-like chat. |
| `packages/ml-engine/src/routers/predict.py` | Market Prediction API | Endpoints for real-time direction forecasts and history. |
| `packages/ml-engine/src/routers/backtest.py` | Strategy Backtesting API | Logic for running historical simulations on market data. |
| `packages/ml-engine/src/routers/trades.py` | Paper Trading Manager | CRUD for local portfolio trades and performance metrics. |
| `packages/desktop/src-tauri/src/lib.rs` | Tauri Core Logic | Main Rust entry point, sidecar management, and IPC handlers. |
| `packages/desktop/src-tauri/tauri.conf.json` | Tauri Configuration | Bundle settings, security CSP, and plugin configurations. |
| `packages/desktop/src-tauri/src/main.rs` | Rust Binary Entry | Minimal entry point that invokes the tauri app builder. |
| `packages/ui/index.html` | Frontend Entry Point | The shell for the high-performance terminal UI. |

---

## 2. Project Evolution (Monthly Log)

### **March 2026: Foundation**
- **Week 1-2**: Conceptualized the AXIOM terminal as a replacement for high-latency web scrapers.
- **Week 3**: Initial database migration from flat JSON files to a relational MySQL structure on Aiven for the portfolio manager.
- **Week 4**: Hardened the SQL console and implemented CSRF protection to secure the management interface.

### **April 2026: The "Sidecar" Pivot**
- **April 1-3**: Transitioned from a centralized web app to a **Local-First Sidecar Architecture**. Replaced MySQL with **DuckDB** for ultra-fast local analytical processing.
- **April 4-5**: Introduced the **Vectorized ML Engine**. Optimized technical analysis (RSI, ATR, MACD) to run on NumPy/Pandas, reducing latency from seconds to milliseconds.
- **April 6**: Integrated **FTS5 Fuzzy Search** for global symbols, allowing users to find tickers across NSE, BSE, NASDAQ, and NYSE instantly.
- **April 7 (Now)**: **Production Hardening**. Final security audit of API boundaries, implementation of strict "Extra-Forbid" validation, and preparation for direct distribution via GitHub Releases.

---

## 3. Durability Status
> [!TIP]
> The system is currently in "High Durability" mode—every external API call and database operation is wrapped in a `try...except` block with automated logging and fail-safe defaults to prevent application crashes during market volatility.
