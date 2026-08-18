"""
Centralized locker + request state machine.

Rule 3 of the architecture: business/authorization rules never live in the
frontend. This module is the single authority for whether a transition is
legal. Every transition also writes an audit event, so the compliance
timeline is always a faithful reconstruction of what happened.
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.enums import LockerStatus, RequestStatus
from app.core.responses import ApiError
from app.models import Locker, LockerRequest, User
from app.services.audit_service import record_event

# Legal locker-status transitions (from -> allowed set of to)
LOCKER_TRANSITIONS: dict[str, set[str]] = {
    LockerStatus.AVAILABLE.value: {LockerStatus.OCCUPIED.value, LockerStatus.MAINTENANCE.value, LockerStatus.RESTRICTED.value},
    LockerStatus.OCCUPIED.value: {LockerStatus.VERIFICATION_PENDING.value, LockerStatus.ACCESS_ACTIVE.value, LockerStatus.MAINTENANCE.value, LockerStatus.RESTRICTED.value, LockerStatus.AVAILABLE.value},
    LockerStatus.VERIFICATION_PENDING.value: {LockerStatus.ACCESS_ACTIVE.value, LockerStatus.OCCUPIED.value, LockerStatus.RESTRICTED.value},
    LockerStatus.ACCESS_ACTIVE.value: {LockerStatus.OCCUPIED.value, LockerStatus.MAINTENANCE.value},
    LockerStatus.MAINTENANCE.value: {LockerStatus.AVAILABLE.value, LockerStatus.OCCUPIED.value, LockerStatus.RESTRICTED.value},
    LockerStatus.RESTRICTED.value: {LockerStatus.AVAILABLE.value, LockerStatus.OCCUPIED.value, LockerStatus.MAINTENANCE.value},
}

# Legal request-status transitions
REQUEST_TRANSITIONS: dict[str, set[str]] = {
    RequestStatus.SUBMITTED.value: {
        RequestStatus.VERIFICATION_PENDING.value,
        RequestStatus.APPROVED.value,
        RequestStatus.MANUAL_REVIEW.value,
        RequestStatus.REJECTED.value,
        RequestStatus.CANCELLED.value,
        RequestStatus.BLOCKED.value,          # face-verify: attempt limit hit before tokens
    },
    RequestStatus.VERIFICATION_PENDING.value: {
        RequestStatus.TOKEN_A_VERIFIED.value,
        RequestStatus.REJECTED.value,
        RequestStatus.EXPIRED.value,
        RequestStatus.CANCELLED.value,
    },
    RequestStatus.TOKEN_A_VERIFIED.value: {
        RequestStatus.TOKEN_B_VERIFIED.value,
        RequestStatus.REJECTED.value,
        RequestStatus.EXPIRED.value,
    },
    RequestStatus.TOKEN_B_VERIFIED.value: {
        RequestStatus.APPROVAL_PENDING.value,
        RequestStatus.APPROVED.value,
        RequestStatus.MANUAL_REVIEW.value,    # face-verify: low confidence / liveness fail
        RequestStatus.REJECTED.value,         # face-verify: face_match=false
        RequestStatus.BLOCKED.value,          # face-verify: attempts exhausted
    },
    RequestStatus.APPROVAL_PENDING.value: {RequestStatus.APPROVED.value, RequestStatus.REJECTED.value},
    RequestStatus.APPROVED.value: {RequestStatus.ACCESS_ACTIVE.value, RequestStatus.SUBMITTED.value, RequestStatus.REJECTED.value},
    RequestStatus.ACCESS_ACTIVE.value: {RequestStatus.COMPLETED.value, RequestStatus.SUBMITTED.value, RequestStatus.APPROVED.value},
    RequestStatus.MANUAL_REVIEW.value: {RequestStatus.APPROVED.value, RequestStatus.REJECTED.value, RequestStatus.SUBMITTED.value},
    RequestStatus.COMPLETED.value: {RequestStatus.SUBMITTED.value},
    RequestStatus.REJECTED.value: {RequestStatus.SUBMITTED.value},
    RequestStatus.EXPIRED.value: {RequestStatus.SUBMITTED.value},
    RequestStatus.CANCELLED.value: {RequestStatus.SUBMITTED.value},
    RequestStatus.BLOCKED.value: {RequestStatus.SUBMITTED.value},       # reset allows re-enabling
}


def transition_locker(
    db: Session, locker: Locker, new_status: str, actor: User | None, correlation_id: str | None = None
) -> Locker:
    allowed = LOCKER_TRANSITIONS.get(locker.status, set())
    if new_status not in allowed:
        raise ApiError(
            "INVALID_STATE_TRANSITION",
            f"Cannot transition locker from {locker.status} to {new_status}",
            409,
        )
    previous = locker.status
    locker.status = new_status
    locker.last_operation_at = datetime.now(timezone.utc)
    db.flush()
    record_event(
        db,
        actor=actor,
        action="LOCKER_STATE_CHANGED",
        entity_type="LOCKER",
        entity_id=locker.id,
        previous_state=previous,
        new_state=new_status,
        correlation_id=correlation_id,
    )
    return locker


def transition_request(
    db: Session, req: LockerRequest, new_status: str, actor: User | None, metadata: dict | None = None
) -> LockerRequest:
    allowed = REQUEST_TRANSITIONS.get(req.status, set())
    if new_status not in allowed:
        raise ApiError(
            "INVALID_STATE_TRANSITION",
            f"Cannot transition request from {req.status} to {new_status}",
            409,
        )
    previous = req.status
    req.status = new_status
    db.flush()
    record_event(
        db,
        actor=actor,
        action="REQUEST_STATE_CHANGED",
        entity_type="LOCKER_REQUEST",
        entity_id=req.id,
        previous_state=previous,
        new_state=new_status,
        metadata=metadata,
        correlation_id=req.correlation_id,
    )
    return req
