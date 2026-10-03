from fastapi import APIRouter, Header, Request

from ..deps import authorized_session, domain_error, store
from ..models import LobbyResponse
from .sessions import frontend_origin

router = APIRouter(tags=["participants"])


@router.post("/sessions/{session_id}/requests/{request_id}/approve", response_model=LobbyResponse)
async def approve_request(session_id: str, request_id: str, request: Request, host_token: str | None = Header(default=None, alias="X-Host-Token")) -> LobbyResponse:
    record = authorized_session(session_id, host_token)
    try:
        await store.approve_request(record, request_id)
    except ValueError as error:
        raise domain_error(error) from error
    return store.lobby(record, frontend_origin(request))


@router.post("/sessions/{session_id}/requests/{request_id}/reject", response_model=LobbyResponse)
async def reject_request(session_id: str, request_id: str, request: Request, host_token: str | None = Header(default=None, alias="X-Host-Token")) -> LobbyResponse:
    record = authorized_session(session_id, host_token)
    try:
        await store.reject_request(record, request_id)
    except ValueError as error:
        raise domain_error(error) from error
    return store.lobby(record, frontend_origin(request))


@router.delete("/sessions/{session_id}/participants/{participant_id}", response_model=LobbyResponse)
async def remove_participant(session_id: str, participant_id: str, request: Request, host_token: str | None = Header(default=None, alias="X-Host-Token")) -> LobbyResponse:
    record = authorized_session(session_id, host_token)
    try:
        await store.remove_participant(record, participant_id)
    except ValueError as error:
        raise domain_error(error) from error
    return store.lobby(record, frontend_origin(request))
