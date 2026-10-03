from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    WAITING = "WAITING"
    LOCKED = "LOCKED"
    FULL = "FULL"
    STARTING = "STARTING"
    STARTED = "STARTED"
    ENDED = "ENDED"


class ParticipantStatus(str, Enum):
    APPROVED = "approved"


class RequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class CreateSessionRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    capacity: int = Field(ge=2, le=100)


class SessionCredentials(BaseModel):
    session_id: str
    host_token: str
    name: str
    capacity: int
    status: SessionStatus


class InvitationResponse(BaseModel):
    token: str
    invitation_url: str
    expires_at: datetime
    active: bool


class ParticipantResponse(BaseModel):
    id: str
    display_name: str
    status: ParticipantStatus
    created_at: datetime


class JoinRequestResponse(BaseModel):
    id: str
    display_name: str
    status: RequestStatus
    created_at: datetime


class LobbyResponse(BaseModel):
    session_id: str
    name: str
    capacity: int
    status: SessionStatus
    host_token: Optional[str] = None
    invitation: Optional[InvitationResponse] = None
    participants: list[ParticipantResponse]
    pending_requests: list[JoinRequestResponse]


class JoinRequestCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=80)


class ErrorResponse(BaseModel):
    detail: str
    code: str
