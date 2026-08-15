from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BranchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    branch_code: str
    name: str
    address: str
    city: str
    state: str
    status: str


class LockerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    branch_id: str
    locker_number: str
    locker_size: str
    status: str
    customer_id: str | None = None
    last_operation_at: datetime | None = None


class LockerRequestCreate(BaseModel):
    locker_id: str
    request_type: str = "ACCESS"
    scheduled_at: datetime | None = None


class LockerRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    locker_id: str
    customer_id: str
    request_type: str
    status: str
    requested_at: datetime
    scheduled_at: datetime | None = None
    approved_by: str | None = None
    completed_at: datetime | None = None
    rejection_reason: str | None = None
    correlation_id: str


class RejectRequest(BaseModel):
    reason: str


class VerifyTokenRequest(BaseModel):
    token: str


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    actor_id: str | None = None
    actor_role: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    previous_state: str | None = None
    new_state: str | None = None
    event_metadata: dict | None = None
    correlation_id: str | None = None
    created_at: datetime


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: datetime
