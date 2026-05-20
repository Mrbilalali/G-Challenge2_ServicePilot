from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
from core.database import db_save_chat

class ConnectionManager:
    def __init__(self):
        # Maps chat_room_id to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, message: str, room_id: str, exclude_websocket: WebSocket = None):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                if connection != exclude_websocket:
                    try:
                        await connection.send_text(message)
                    except Exception:
                        pass

manager = ConnectionManager()

async def handle_chat_websocket(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # Save message to database
            db_save_chat({
                "booking_id": room_id.replace("room_", ""),
                "role": payload.get("sender_id", "user"),
                "text": payload.get("text", "")
            })
            
            # Broadcast message to others in the same room
            await manager.broadcast(
                json.dumps({
                    "sender_id": payload.get("sender_id", "user"),
                    "text": payload.get("text", ""),
                    "timestamp": payload.get("timestamp", "")
                }),
                room_id,
                exclude_websocket=websocket
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
    except Exception as e:
        print(f"WebSocket Error: {e}")
        manager.disconnect(websocket, room_id)
