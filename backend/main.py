import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .deps import store
from .realtime import RealtimeSessionManager
from .routes import invitations, participants, sessions

app = FastAPI(title="Roundtable API", version="0.1.0")
configured_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", *configured_origins],
    allow_origin_regex=r"https?://(?:[^/]+:5173|[a-zA-Z0-9-]+\.ngrok(?:-free)?\.(?:app|dev|io))",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

realtime = RealtimeSessionManager(store)

app.include_router(sessions.router, prefix="/api", dependencies=[])
app.include_router(invitations.router, prefix="/api")
app.include_router(participants.router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws/sessions/{session_id}")
async def session_socket(
    websocket: WebSocket,
    session_id: str,
    host_token: str | None = None,
    participant_id: str | None = None,
    participant_token: str | None = None,
):
    await realtime.handle_websocket(
        websocket,
        session_id,
        host_token=host_token,
        participant_id=participant_id,
        participant_token=participant_token,
    )
