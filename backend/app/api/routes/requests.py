from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.responses import success, ApiError
from app.core.enums import RequestStatus
from app.api.deps import require_customer, get_current_user
from app.models import User, Locker, LockerRequest
from app.schemas.domain import LockerRequestCreate, LockerRequestOut
from app.services.audit_service import record_event
from app.services.state_machine import transition_request

router = APIRouter(prefix="/api/v1/requests", tags=["Requests"])


@router.post("", summary="Submit a new locker access/inspection/maintenance/closure request")
def create_request(
    payload: LockerRequestCreate,
    user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    locker = db.query(Locker).filter(Locker.id == payload.locker_id).first()
    if not locker:
        raise ApiError("LOCKER_NOT_FOUND", "Locker does not exist", 404)
    if locker.customer_id != user.id:
        raise ApiError("FORBIDDEN", "This locker is not assigned to you", 403)
    if locker.status not in ("OCCUPIED", "AVAILABLE"):
        raise ApiError("LOCKER_UNAVAILABLE", f"Locker is currently {locker.status} and cannot accept new requests", 409)

    existing = (
        db.query(LockerRequest)
        .filter(
            LockerRequest.locker_id == locker.id,
            LockerRequest.status.notin_([
                RequestStatus.COMPLETED.value, RequestStatus.REJECTED.value,
                RequestStatus.EXPIRED.value, RequestStatus.CANCELLED.value,
            ]),
        )
        .first()
    )
    if existing:
        raise ApiError("DUPLICATE_REQUEST", "An active request already exists for this locker", 409)

    req = LockerRequest(
        locker_id=locker.id,
        customer_id=user.id,
        request_type=payload.request_type,
        status=RequestStatus.SUBMITTED.value,
        scheduled_at=payload.scheduled_at,
    )
    db.add(req)
    db.flush()
    record_event(db, actor=user, action="REQUEST_SUBMITTED", entity_type="LOCKER_REQUEST",
                 entity_id=req.id, new_state=req.status, correlation_id=req.correlation_id)
    db.commit()
    db.refresh(req)
    return success(LockerRequestOut.model_validate(req).model_dump(), "Request submitted successfully", 201)


@router.get("/{request_id}", summary="Get a request's current status and detail")
def get_request(request_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(LockerRequest).filter(LockerRequest.id == request_id).first()
    if not req:
        raise ApiError("REQUEST_NOT_FOUND", "Request does not exist", 404)
    if user.role == "CUSTOMER" and req.customer_id != user.id:
        raise ApiError("FORBIDDEN", "You cannot view this request", 403)
    return success(LockerRequestOut.model_validate(req).model_dump())


@router.post("/{request_id}/cancel", summary="Customer cancels their own pending request")
def cancel_request(request_id: str, user: User = Depends(require_customer), db: Session = Depends(get_db)):
    req = db.query(LockerRequest).filter(LockerRequest.id == request_id).first()
    if not req:
        raise ApiError("REQUEST_NOT_FOUND", "Request does not exist", 404)
    if req.customer_id != user.id:
        raise ApiError("FORBIDDEN", "You cannot cancel this request", 403)

    transition_request(db, req, "CANCELLED", user)
    db.commit()
    db.refresh(req)
    return success(LockerRequestOut.model_validate(req).model_dump(), "Request cancelled")
