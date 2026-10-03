from fastapi import APIRouter, Header, Request

from ..deps import authorized_session, domain_error, store
from ..models import (
    InvitationPreview,
    InvitationResponse,
    JoinRequestCreate,
    JoinRequestResponse,
    JoinRequestStatusResponse,
    RequestStatus,
)
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


@router.get("/invitations/{token}", response_model=InvitationPreview)
def invitation_preview(token: str, request: Request) -> InvitationPreview:
    """Public session summary for the Join page. Unknown tokens return 404."""
    record = store.find_by_invitation(token)
    if record is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"code": "invalid_invitation", "message": "Invitation not found."})
    return store.invitation_preview(record, frontend_origin(request))


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


@router.get("/invitations/{token}/requests/{request_id}", response_model=JoinRequestStatusResponse)
def join_request_status(token: str, request_id: str) -> JoinRequestStatusResponse:
    """Poll a join request. Returns the participant credential once approved."""
    record = store.find_by_invitation(token)
    if record is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"code": "invalid_invitation", "message": "Invitation not found."})
    join_request = record.requests.get(request_id)
    if join_request is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"code": "invalid_request", "message": "Join request not found or already handled."})
    participant_id = join_request.participant_id
    participant_token = None
    if join_request.status == RequestStatus.APPROVED and participant_id:
        participant = record.participants.get(participant_id)
        if participant is not None:
            participant_token = participant.access_token
    return JoinRequestStatusResponse(
        id=join_request.id,
        display_name=join_request.display_name,
        status=join_request.status,
        created_at=join_request.created_at,
        participant_id=participant_id,
        participant_token=participant_token,
    )
