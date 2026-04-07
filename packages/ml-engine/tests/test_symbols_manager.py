import pytest
import os
import asyncio
from common_services.symbols_manager import SymbolsManager

@pytest.fixture
async def manager(tmp_path):
    db_file = tmp_path / "test_symbols.db"
    mgr = SymbolsManager(db_path=str(db_file))
    await mgr.init_db()
    return mgr

@pytest.mark.asyncio
async def test_add_and_search_symbols(manager):
    stocks = [
        {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "currency": "USD",
            "exchange": "NASDAQ",
            "mic_code": "XNAS",
            "country": "USA",
            "type": "Common Stock"
        },
        {
            "symbol": "RELIANCE.NS",
            "name": "Reliance Industries Limited",
            "currency": "INR",
            "exchange": "NSE",
            "mic_code": "XNSE",
            "country": "India",
            "type": "Common Stock"
        }
    ]
    
    await manager.add_symbols_bulk(stocks)
    
    # Search by symbol
    results = await manager.search_symbols("AAPL")
    assert len(results) == 1
    assert results[0]["symbol"] == "AAPL"
    
    # Search by name
    results = await manager.search_symbols("Reliance")
    assert len(results) == 1
    assert results[0]["symbol"] == "RELIANCE.NS"
    
    # Filter by exchange
    results = await manager.search_symbols("A", exchange="NSE")
    assert len(results) == 0 # Apple is NASDAQ

@pytest.mark.asyncio
async def test_get_all_exchanges(manager):
    stocks = [
        {"symbol": "S1", "name": "N1", "currency": "C", "exchange": "EX1", "mic_code": "M", "country": "C", "type": "T"},
        {"symbol": "S2", "name": "N2", "currency": "C", "exchange": "EX2", "mic_code": "M", "country": "C", "type": "T"}
    ]
    await manager.add_symbols_bulk(stocks)
    
    exchanges = await manager.get_all_exchanges()
    assert "EX1" in exchanges
    assert "EX2" in exchanges
    assert len(exchanges) == 2
