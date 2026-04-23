import logging

from fastapi import APIRouter, Query, Request

router = APIRouter()
logger = logging.getLogger(__name__)

# All exchanges understood by this terminal
SUPPORTED_EXCHANGES = ["NSE", "BSE", "NASDAQ", "NYSE", "TSE"]


@router.get("/search")
async def search_symbols(
    request: Request,
    q: str = Query(..., min_length=1, max_length=50, pattern=r"^[a-zA-Z0-9 ]+$"),
    exchange: str | None = Query(None, pattern=r"^[a-zA-Z0-9]{2,10}$"),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Search for stocks across global exchanges with validation.
    """
    try:
        symbols_manager = request.app.state.symbols
        results = await symbols_manager.search_symbols(q, exchange=exchange, limit=limit)
        return {"results": results, "count": len(results)}
    except Exception as e:
        logger.error(f"Symbols search failed for '{q}': {e}")
        return {"results": [], "count": 0, "error": "Search service unavailable"}


@router.get("/exchanges")
async def list_exchanges(request: Request):
    """
    List all supported exchanges in the local database.
    """
    try:
        symbols_manager = request.app.state.symbols
        exchanges = await symbols_manager.get_all_exchanges()
        return {"exchanges": exchanges}
    except Exception as e:
        logger.error(f"Failed to list exchanges: {e}")
        return {"exchanges": []}


@router.get("/stats")
async def get_stats(request: Request):
    """
    Get statistics about the symbol database.
    """
    try:
        symbols_manager = request.app.state.symbols
        total_count = await symbols_manager.count_symbols()
        return {"total_symbols": total_count}
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        return {"total_symbols": 0}


@router.get("/list")
async def list_symbols(
    request: Request,
    exchange: str = Query("NASDAQ", pattern=r"^[A-Z]{2,6}$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=200),
):
    """
    Paginated listing of all symbols for a given exchange.
    Returns symbol metadata (no live prices — use /quotes/batch for pricing).
    """
    try:
        symbols_manager = request.app.state.symbols
        offset = (page - 1) * page_size
        symbols = await symbols_manager.list_symbols(exchange=exchange, limit=page_size, offset=offset)
        total = await symbols_manager.count_symbols(exchange=exchange)
        return {
            "exchange": exchange,
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "symbols": symbols,
        }
    except Exception as e:
        logger.error(f"Failed to list symbols for {exchange}: {e}")
        return {"exchange": exchange, "page": page, "page_size": page_size, "total": 0, "total_pages": 0, "symbols": []}
