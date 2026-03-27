# packages/ml-engine/src/routers/terminal.py
# Adapted for Sidecar: Local-only, No Auth, DuckDB-backed

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)

class TerminalWSManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

ws_manager = TerminalWSManager()

@router.websocket("/terminal/{client_id}")
async def websocket_terminal_endpoint(websocket: WebSocket, client_id: str):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Maintain connection and listen for inbound
            data = await websocket.receive_text()
            # Simple heartbeat or command handling
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS error for {client_id}: {e}")
        ws_manager.disconnect(websocket)
