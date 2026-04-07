# packages/ml-engine/src/routers/geo.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

import logging

from fastapi import APIRouter, Request

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/vessels")
async def get_vessels(
    request: Request, lat_min: float, lat_max: float, lon_min: float, lon_max: float
):
    # In desktop, we fetch from a local DuckDB cache or proxy to an AIS API.
    # The original was likely using an AIS data service.
    db = request.app.state.db

    try:
        # Query DuckDB for locally cached vessel positions
        sql = """
            SELECT * FROM vessel_history 
            WHERE lat BETWEEN ? AND ? 
            AND lon BETWEEN ? AND ?
            ORDER BY ts DESC LIMIT 100
        """
        df = db.query(sql, [lat_min, lat_max, lon_min, lon_max])
        return df.to_dict(orient="records")

    except Exception as e:
        logger.error(f"Geo-Intelligence error: {str(e)}")
        return []


@router.get("/vessels/{mmsi}/history")
async def get_vessel_history(request: Request, mmsi: int):
    db = request.app.state.db
    df = db.query("SELECT * FROM vessel_history WHERE mmsi = ? ORDER BY ts DESC LIMIT 500", [mmsi])
    return df.to_dict(orient="records")
