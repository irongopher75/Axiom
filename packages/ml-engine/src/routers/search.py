# packages/ml-engine/src/routers/search.py
# Sidecar: Local Symbol Search across multiple exchanges

import asyncio
import json
import logging
import os

from fastapi import APIRouter, Query

router = APIRouter()
logger = logging.getLogger(__name__)

# Path to data directory
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


@router.get("")
async def search_symbols(
    q: str = Query(..., min_length=1, max_length=50, pattern=r"^[a-zA-Z0-9 ]+$")
):
    """Searches for symbols across all local data files with sanitization."""
    q_upper = q.upper().strip()
    results = []

    # Files to search
    exchange_files = [
        "nasdaq_symbols.json",
        "nyse_symbols.json",
        "nse_symbols.json",
        "bse_symbols.json",
    ]

    try:
        def _perform_search():
            found = []
            for filename in exchange_files:
                path = os.path.join(DATA_DIR, filename)
                if not os.path.exists(path):
                    continue

                try:
                    with open(path) as f:
                        symbols = json.load(f)
                        for item in symbols:
                            # Match symbol or name
                            if q_upper in item["symbol"].upper() or q_upper in item["name"].upper():
                                found.append(
                                    {
                                        "symbol": item["symbol"],
                                        "name": item["name"],
                                        "exchange": item.get(
                                            "exchange", filename.replace("_symbols.json", "").upper()
                                        ),
                                        "typeDisp": item.get("typeDisp", "Equity"),
                                    }
                                )
                                if len(found) >= 20: # Slightly higher limit for internal search
                                    return found
                except Exception as e:
                    logger.error(f"Search failed in {filename}: {e}")
            return found

        # Offload file I/O and processing to thread
        results = await asyncio.to_thread(_perform_search)
        return results

    except Exception as e:
        logger.error(f"Global search failed for '{q}': {e}")
        return []
