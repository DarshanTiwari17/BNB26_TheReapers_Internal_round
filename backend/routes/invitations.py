from fastapi import APIRouter, Header, Request

from ..deps import authorized_session, domain_error, store
from ..models import InvitationResponse, JoinRequestCreate, JoinRequestResponse
from .sessions import frontend_origin

router = APIRouter(tags=["invitations"])


@router.post("/sessions/{session_id}/invitation", response_model=InvitationResponse)
async def create_invitation(session_id: str, request: Request, host_token: str | None = Header(default=None, alias="X-Host-Token")) -> InvitationResponse:
    record = authorized_session(session_id, host_token)
    await store.create_invitation(record)
    return store.invitation_response(record, frontend_origin(request))


@router.post("/sessions/{session_id}/invitation/regenerate", response_model=InvitationResponse)
async def regenerate_invitation(session_id: str, request: Request, host_token: str | None = Header(default=None, alias="X-Host-Token")) -> InvitationResponse:
    record = authorized_session(session_id, host_token)
    await store.regenerate_invitation(record)
    return store.invitation_response(record, frontend_origin(request))


@router.post("/invitations/{token}/join", response_model=JoinRequestResponse)
async def request_to_join(token: str, payload: JoinRequestCreate) -> JoinRequestResponse:
    record = store.find_by_invitation(token)
    if record is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"code": "invalid_invitation", "message": "Invitation not found."})
    try:
        request = await store.request_join(record, token, payload.display_name)
    except ValueError as error:
        raise domain_error(error) from error
    return JoinRequestResponse(id=request.id, display_name=request.display_name, status=request.status, created_at=request.created_at)
