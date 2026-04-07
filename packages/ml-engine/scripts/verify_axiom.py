"""
Axiom Hardening Verification – Unit-level checks
(Does not start the full app, avoids needing runtime data_dir)
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import asyncio
import tempfile

# ─── 1. Import health check ────────────────────────────────────
print("\n[1] Checking all router imports load without errors...")
try:
    from routers import ai, backtest, news, predict, quotes, search, symbols, terminal, trades, users
    print("    [PASS] All routers imported successfully")
except Exception as e:
    print(f"    [FAIL] Import error: {e}")

# ─── 2. Pydantic extra='forbid' validation ─────────────────────
print("\n[2] Testing strict Pydantic validation (extra='forbid')...")
try:
    from pydantic import ValidationError
    from routers.trades import TradeExecuteRequest
    try:
        TradeExecuteRequest(symbol="AAPL", side="BUY", price=100.0, quantity=1, injected_field="evil")
        print("    [FAIL] Extra field was accepted — model is not strict!")
    except ValidationError as e:
        print("    [PASS] Extra field rejected by Pydantic (422 in production)")
except Exception as e:
    print(f"    [FAIL] Unexpected error: {e}")

# ─── 3. Symbol regex validation ────────────────────────────────
print("\n[3] Testing symbol regex validation...")
try:
    from pydantic import ValidationError
    from routers.trades import TradeExecuteRequest
    try:
        TradeExecuteRequest(symbol="'; DROP TABLE--", side="BUY", price=100.0, quantity=1)
        print("    [FAIL] Malicious symbol was accepted!")
    except ValidationError:
        print("    [PASS] Malicious symbol rejected by regex pattern")
except Exception as e:
    print(f"    [FAIL] Unexpected error: {e}")

# ─── 4. DuckDB client initialisation ──────────────────────────
print("\n[4] Testing DuckDB client initialises successfully...")
try:
    from common_db.duckdb_client import DuckDBClient
    from pathlib import Path
    with tempfile.TemporaryDirectory() as tmpdir:
        db = DuckDBClient(Path(tmpdir) / "test.duckdb")
        asyncio.run(db.initialize())
        result = db.query("SELECT 42 AS answer")
        if result.iloc[0]["answer"] == 42:
            print("    [PASS] DuckDB initialises and executes queries")
        else:
            print("    [FAIL] Unexpected query result")
except Exception as e:
    print(f"    [FAIL] DuckDB error: {e}")

# ─── 5. SymbolsManager sanitises dangerous FTS5 chars ─────────
print("\n[5] Testing SymbolsManager query sanitisation...")
try:
    from common_services.symbols_manager import SymbolsManager
    with tempfile.TemporaryDirectory() as tmpdir:
        mgr = SymbolsManager(db_path=str(Path(tmpdir) / "symbols.db"))
        asyncio.run(mgr.init_db())
        # Inject FTS5 special chars — should return [] gracefully, not crash
        results = asyncio.run(mgr.search_symbols('"*:dangerous*"'))
        if isinstance(results, list):
            print("    [PASS] Dangerous FTS5 query absorbed gracefully")
        else:
            print("    [FAIL] Unexpected return type")
except Exception as e:
    print(f"    [FAIL] Unexpected error: {e}")

# ─── 6. MarketAnalyzer sanity check ───────────────────────────
print("\n[6] Testing MarketAnalyzer imports and instantiates cleanly...")
try:
    from app.services.ml_engine import MarketAnalyzer
    analyzer = MarketAnalyzer("AAPL")
    assert analyzer.symbol == "AAPL"
    assert analyzer.data is None
    print("    [PASS] MarketAnalyzer instantiated correctly")
except Exception as e:
    print(f"    [FAIL] {e}")

print("\n=== VERIFICATION COMPLETE ===\n")
