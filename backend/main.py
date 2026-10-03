import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .deps import store
from .room_manager import RoomManager
from .routes import invitations, participants, sessions

room_manager = RoomManager()

app = FastAPI(title="Roundtable API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"http://[^/]+:5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api", dependencies=[])
app.include_router(invitations.router, prefix="/api")
app.include_router(participants.router, prefix="/api")


async def broadcast_room(session_id: str, event: dict) -> None:
    room = room_manager.get_or_create(session_id)
    participants = [p for p in room["participants"].values() if p.get("websocket") is not None]
    for participant in participants:
        socket = participant.get("websocket")
        if socket is None:
            continue
        try:
            await socket.send_json(event)
        except RuntimeError:
            pass


@app.websocket("/ws/session/{session_id}")
async def session_socket(
    websocket: WebSocket,
    session_id: str,
    participant_id: str | None = None,
    participant_token: str | None = None,
    host_token: str | None = None,
    display_name: str = "Guest",
) -> None:
    record = store.get(session_id)
    if record is None:
        await websocket.close(code=1008, reason="session_not_found")
        return

    authorized = False
    resolved_name = display_name or "Guest"
    resolved_id = participant_id or "host"

    if host_token and store.authorize_host(record, host_token):
        authorized = True
        resolved_name = record.host_name
        resolved_id = "host"
    elif participant_id and participant_token and store.authorize_participant(record, participant_id, participant_token):
        participant = record.participants.get(participant_id)
        if participant is not None:
            authorized = True
            resolved_name = participant.display_name
            resolved_id = participant.id

    if not authorized:
        await websocket.close(code=1008, reason="invalid_session_auth")
        return

    await websocket.accept()
    room_manager.register_participant(session_id, resolved_id, resolved_name, websocket)
    await websocket.send_json({"type": "room_state", "payload": room_manager.room_snapshot(session_id)})

    try:
        while True:
            payload = await websocket.receive_text()
            message = json.loads(payload)
            message_type = message.get("type")
            if message_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            if message_type == "audio":
                energy = float(message.get("energy", 0.0))
                anchor = room_manager.update_energy(session_id, resolved_id, energy)
                if anchor and anchor["id"] == resolved_id:
                    room_manager.add_transcript_line(session_id, resolved_id, "Live draft caption from strongest connected stream", 0.72)
                await broadcast_room(session_id, {"type": "room_state", "payload": room_manager.room_snapshot(session_id)})
                continue
            if message_type == "transcript":
                text = str(message.get("text", "")).strip()
                if text:
                    room_manager.add_transcript_line(session_id, resolved_id, text, float(message.get("confidence", 0.7)))
                    await broadcast_room(session_id, {"type": "room_state", "payload": room_manager.room_snapshot(session_id)})
                continue
            if message_type == "presence":
                await broadcast_room(session_id, {"type": "room_state", "payload": room_manager.room_snapshot(session_id)})
    except WebSocketDisconnect:
        room_manager.unregister_participant(session_id, resolved_id)
        await broadcast_room(session_id, {"type": "room_state", "payload": room_manager.room_snapshot(session_id)})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
