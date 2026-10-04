from fastapi import Header, HTTPException

from .store import InMemorySessionStore, SessionRecord

store = InMemorySessionStore()


def authorized_session(session_id: str, host_token: str | None) -> SessionRecord:
    record = store.get(session_id)
    if record is None:
        raise HTTPException(status_code=404, detail={"code": "session_not_found", "message": "Session not found."})
    if not host_token or not store.authorize_host(record, host_token):
        raise HTTPException(status_code=403, detail={"code": "invalid_host_authorization", "message": "Host authorization is invalid."})
    return record


def host_token_header(x_host_token: str | None = Header(default=None)) -> str | None:
    return x_host_token


def domain_error(error: ValueError) -> HTTPException:
    messages = {
        "invalid_invitation": (404, "Invitation not found."),
        "invitation_invalidated": (410, "This invitation has been invalidated."),
        "invitation_expired": (410, "This invitation has expired."),
        "invalid_host_token": (401, "Host token is invalid."),
        "invalid_participant_token": (401, "Participant token is invalid."),
        "session_locked": (423, "This session is locked."),
        "session_full": (409, "This session is full."),
        "session_already_started": (409, "This session has already started."),
        "session_ended": (409, "This session has ended."),
        "duplicate_request": (409, "A request for this participant already exists."),
        "invalid_request": (404, "Join request not found or already handled."),
        "participant_not_found": (404, "Participant not found."),
    }
    status, message = messages.get(str(error), (400, "The requested session action could not be completed."))
    return HTTPException(status_code=status, detail={"code": str(error), "message": message})
