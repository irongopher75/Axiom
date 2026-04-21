import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.sidecar_auth import SidecarUser
from routers.users import get_current_admin

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/pending-users")
async def get_pending_users(
    request: Request, current_user: SidecarUser = Depends(get_current_admin)
):
    db = request.app.state.db
    try:
        df = db.query(
            """
            SELECT email, is_active, is_approved, is_superuser
            FROM users
            WHERE is_approved = FALSE
            ORDER BY created_at ASC
            """
        )
        if df.empty:
            return []
        records = []
        for record in df.to_dict(orient="records"):
            records.append(
                {
                    "id": record["email"],
                    "email": record["email"],
                    "is_active": bool(record["is_active"]),
                    "is_approved": bool(record["is_approved"]),
                    "is_superuser": bool(record["is_superuser"]),
                }
            )
        return records
    except Exception as exc:
        logger.error("Failed to fetch pending users: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load pending users.")


@router.post("/approve/{user_id}")
async def approve_user(
    user_id: str, request: Request, current_user: SidecarUser = Depends(get_current_admin)
):
    db = request.app.state.db
    try:
        await db.execute(
            "UPDATE users SET is_approved = TRUE, is_active = TRUE WHERE email = ?",
            [user_id],
        )
        return {"id": user_id, "status": "approved"}
    except Exception as exc:
        logger.error("Failed to approve %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Approval failed.")


@router.get("/users-overview")
async def get_users_overview(
    request: Request, current_user: SidecarUser = Depends(get_current_admin)
):
    db = request.app.state.db
    try:
        df = db.query(
            """
            SELECT
                u.email,
                COUNT(CASE WHEN t.status = 'OPEN' THEN 1 END) AS active_positions,
                COALESCE(SUM(CASE WHEN t.status = 'OPEN' THEN t.entry_price * t.quantity ELSE 0 END), 0) AS active_exposure,
                COALESCE(SUM(CASE WHEN t.status = 'OPEN' THEN t.pnl ELSE 0 END), 0) AS unrealized_pnl,
                COALESCE(SUM(CASE WHEN t.status = 'CLOSED' THEN t.pnl ELSE 0 END), 0) AS realized_pnl
            FROM users u
            LEFT JOIN trades t ON t.user_email = u.email
            WHERE u.is_approved = TRUE
            GROUP BY u.email
            ORDER BY u.email ASC
            """
        )
        if df.empty:
            return []
        return [
            {
                "id": row["email"],
                "email": row["email"],
                "total_equity": 1000000 + float(row["realized_pnl"]) + float(row["unrealized_pnl"]),
                "active_exposure": float(row["active_exposure"]),
                "unrealized_pnl": float(row["unrealized_pnl"]),
                "active_positions": int(row["active_positions"]),
            }
            for row in df.to_dict(orient="records")
        ]
    except Exception as exc:
        logger.error("Failed to load user overview: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load user overview.")
