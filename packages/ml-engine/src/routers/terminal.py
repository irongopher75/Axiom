# packages/ml-engine/src/routers/terminal.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

import logging

from fastapi import APIRouter, Path, WebSocket, WebSocketDisconnect

router = APIRouter()
logger = logging.getLogger(__name__)


class TerminalWSManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        try:
            await websocket.accept()
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
    await ws_manager.connect(websocket)
    try:
        while True:
            # Maintain connection and listen for heartbeat
            # We don't expect complex commands here yet, mostly heartbeats
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info(f"WS client disconnected: {client_id}")
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS error for {client_id}: {e}")
        ws_manager.disconnect(websocket)
