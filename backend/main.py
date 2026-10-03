from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .deps import store
from .routes import invitations, participants, sessions

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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
