# packages/ml-engine/src/routers/terminal.py
import json
import logging

from fastapi import APIRouter, Path, WebSocket, WebSocketDisconnect

from app.core.sidecar_auth import build_user_from_row, decode_access_token, extract_ws_token

router = APIRouter()
logger = logging.getLogger(__name__)


class TerminalWSManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket, subprotocol: str | None = None):
        try:
            await websocket.accept(subprotocol=subprotocol)
            self.active_connections.append(websocket)
        except Exception as e:
            logger.error(f"WS accept failed: {e}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            try:
                self.active_connections.remove(websocket)
            except ValueError:
                pass

    async def broadcast(self, message: dict):
        # Create a copy of connections to iterate safely
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                # Remove stale connections
                self.disconnect(connection)


ws_manager = TerminalWSManager()


@router.websocket("/terminal/{client_id}")
async def websocket_terminal_endpoint(
    websocket: WebSocket,
    client_id: str = Path(..., pattern=r"^[a-zA-Z0-9_-]{1,50}$")
):
    token = extract_ws_token(websocket.headers, dict(websocket.query_params))
    if not token:
        await websocket.close(code=4401, reason="Authentication required")
        return

    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        if not email:
            raise ValueError("Missing subject")
        user_df = websocket.app.state.db.query(
            "SELECT email, is_active, is_approved, is_superuser FROM users WHERE email = ?",
            [email],
        )
        if user_df.empty:
            raise ValueError("Unknown user")
        user = build_user_from_row(tuple(user_df.iloc[0].tolist()))
        if not user or not user.is_active or not user.is_approved:
            raise ValueError("Unauthorized")
    except Exception as exc:
        logger.warning("Rejected WS client %s: %s", client_id, exc)
        await websocket.close(code=4403, reason="Unauthorized")
        return

    await ws_manager.connect(websocket, subprotocol="axiom-v1")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                continue
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue
            if message.get("type") == "PING":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        logger.info(f"WS client disconnected: {client_id}")
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS error for {client_id}: {e}")
        ws_manager.disconnect(websocket)
