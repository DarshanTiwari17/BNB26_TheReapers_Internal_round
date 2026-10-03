import json
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from fastapi import HTTPException, WebSocket, WebSocketDisconnect

from .store import InMemorySessionStore


@dataclass
class SessionConnection:
    session_id: str
    role: str
    participant_id: str | None
    display_name: str
    websocket: WebSocket
    connection_state: str = "connecting"
    microphone_state: str = "connected"
    last_seen_at: float = field(default_factory=time.time)
    last_audio_at: float | None = None


class RealtimeSessionManager:
    def __init__(self, store: InMemorySessionStore) -> None:
        self.store = store
        self._connections: dict[str, dict[WebSocket, SessionConnection]] = defaultdict(dict)

    def _record(self, session_id: str):
        record = self.store.get(session_id)
        if record is None:
            raise HTTPException(status_code=404, detail={"code": "session_not_found", "message": "Session not found."})
        return record

    def _validate_host(self, session_id: str, host_token: str | None) -> dict[str, Any]:
        record = self._record(session_id)
        if not host_token:
            raise HTTPException(status_code=401, detail={"code": "missing_host_token", "message": "Host permission is required."})
        if not self.store.authorize_host(record, host_token):
            raise HTTPException(status_code=403, detail={"code": "invalid_host_token", "message": "Host token is invalid."})
        return {
            "id": "host",
            "display_name": record.host_name,
            "role": "host",
            "participant_id": None,
        }

    def _validate_participant(self, session_id: str, participant_id: str | None, participant_token: str | None) -> dict[str, Any]:
        record = self._record(session_id)
        if not participant_id or not participant_token:
            raise HTTPException(status_code=401, detail={"code": "missing_participant_credential", "message": "Participant credentials are required."})
        if not self.store.authorize_participant(record, participant_id, participant_token):
            raise HTTPException(status_code=403, detail={"code": "invalid_participant_token", "message": "Participant token is invalid."})
        participant = record.participants.get(participant_id)
        if participant is None:
            raise HTTPException(status_code=404, detail={"code": "participant_not_found", "message": "Participant not found."})
        return {
            "id": participant.id,
            "display_name": participant.display_name,
            "role": "participant",
            "participant_id": participant.id,
        }

    async def accept(self, websocket: WebSocket, session_id: str, host_token: str | None = None, participant_id: str | None = None, participant_token: str | None = None) -> None:
        await websocket.accept()
        metadata = self._validate_host(session_id, host_token) if host_token else self._validate_participant(session_id, participant_id, participant_token)
        connection = SessionConnection(
            session_id=session_id,
            role=metadata["role"],
            participant_id=metadata["participant_id"],
            display_name=metadata["display_name"],
            websocket=websocket,
            connection_state="connected",
            microphone_state="connected",
        )
        bucket = self._connections[session_id]
        identity = (connection.role, connection.participant_id or "host")
        for existing_socket, existing in list(bucket.items()):
            if (existing.role, existing.participant_id or "host") == identity:
                del bucket[existing_socket]
                if existing_socket.application_state.name == "CONNECTED":
                    try:
                        await existing_socket.close()
                    except Exception:
                        pass
        bucket[websocket] = connection
        await self.broadcast(session_id)

    def _snapshot(self, session_id: str) -> list[dict[str, Any]]:
        return [
            {
                "id": connection.participant_id or "host",
                "display_name": connection.display_name,
                "role": connection.role,
                "connection_state": connection.connection_state,
                "microphone_state": connection.microphone_state,
                "last_seen_at": connection.last_seen_at,
                "last_audio_at": connection.last_audio_at,
            }
            for connection in self._connections.get(session_id, {}).values()
        ]

    async def broadcast(self, session_id: str) -> None:
        payload = {
            "type": "session_state",
            "session_id": session_id,
            "participants": self._snapshot(session_id),
            "updated_at": time.time(),
        }
        for connection in list(self._connections.get(session_id, {}).values()):
            try:
                await connection.websocket.send_json(payload)
            except Exception:
                await self.disconnect(session_id, connection.websocket)

    async def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        bucket = self._connections.get(session_id, {})
        if websocket in bucket:
            del bucket[websocket]
        if not bucket:
            self._connections.pop(session_id, None)
        if websocket.application_state.name == "CONNECTED":
            try:
                await websocket.close()
            except Exception:
                pass

    async def handle_message(self, session_id: str, websocket: WebSocket, payload: dict[str, Any]) -> None:
        connection = self._connections.get(session_id, {}).get(websocket)
        if connection is None:
            return

        message_type = payload.get("type")
        if message_type == "presence":
            connection.connection_state = payload.get("connection_state", "connected")
            connection.microphone_state = payload.get("microphone_state", "connected")
            connection.last_seen_at = time.time()
            await self.broadcast(session_id)
            return

        if message_type == "peer_signal":
            target_id = payload.get("to_id")
            signal_type = payload.get("signal_type")
            signal = payload.get("signal")
            if not isinstance(target_id, str) or signal_type not in {"offer", "answer", "candidate"}:
                return
            if not isinstance(signal, dict):
                return

            sender_id = connection.participant_id or "host"
            target = next(
                (
                    peer
                    for peer in self._connections.get(session_id, {}).values()
                    if (peer.participant_id or "host") == target_id
                ),
                None,
            )
            if target is None or target.websocket is websocket:
                return
            try:
                await target.websocket.send_json(
                    {
                        "type": "peer_signal",
                        "from_id": sender_id,
                        "signal_type": signal_type,
                        "signal": signal,
                    }
                )
            except Exception:
                await self.disconnect(session_id, target.websocket)
                await self.broadcast(session_id)
            return

        if message_type == "heartbeat":
            connection.last_seen_at = time.time()
            connection.connection_state = "connected"
            await websocket.send_json({"type": "pong", "session_id": session_id})
            return

        if message_type == "leave":
            await self.disconnect(session_id, websocket)
            await self.broadcast(session_id)

    async def handle_websocket(self, websocket: WebSocket, session_id: str, host_token: str | None = None, participant_id: str | None = None, participant_token: str | None = None) -> None:
        await self.accept(websocket, session_id, host_token=host_token, participant_id=participant_id, participant_token=participant_token)
        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                await self.handle_message(session_id, websocket, payload)
        except WebSocketDisconnect:
            await self.disconnect(session_id, websocket)
            await self.broadcast(session_id)
