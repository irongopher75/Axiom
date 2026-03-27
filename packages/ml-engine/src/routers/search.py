# packages/ml-engine/src/routers/search.py
# Sidecar: Local Symbol Search across multiple exchanges

from fastapi import APIRouter, Query
from typing import List
import json
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Path to data directory
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

@router.get("")
async def search_symbols(q: str = Query(..., min_length=1)):
    """Searches for symbols across all local data files."""
    q = q.upper()
    results = []
    
    # Files to search
    exchange_files = ["nasdaq_symbols.json", "nyse_symbols.json", "nse_symbols.json", "bse_symbols.json"]
    
    for filename in exchange_files:
        path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(path):
            continue
            
        try:
            with open(path, 'r') as f:
                symbols = json.load(f)
                for item in symbols:
                    # Match symbol or name
                    if q in item["symbol"].upper() or q in item["name"].upper():
                        # Standardize response for UI (CommandPalette)
                        results.append({
                            "symbol": item["symbol"],
                            "name": item["name"],
                            "exchange": item.get("exchange", filename.replace("_symbols.json", "").upper()),
                            "typeDisp": item.get("typeDisp", "Equity")
                        })
                        if len(results) > 10: break # Limit to 10 results for speed
        except Exception as e:
            logger.error(f"Search failed in {filename}: {e}")
            
        if len(results) > 10: break

    return results
