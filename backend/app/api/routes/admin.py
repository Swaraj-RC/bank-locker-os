from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.responses import success, ApiError
from app.core.enums import RequestStatus, LockerStatus
from app.api.deps import require_staff, require_manager
from app.models import User, Locker, LockerRequest, AuditEvent, Branch
from app.schemas.domain import LockerOut, LockerRequestOut, RejectRequest
from app.services.audit_service import record_event
from app.services.state_machine import transition_request, transition_locker

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/dashboard", summary="KPI summary for the admin dashboard")
def dashboard(user: User = Depends(require_staff), db: Session = Depends(get_db)):
    q = db.query(Locker)
    if user.role != "SUPER_ADMIN" and user.branch_id:
        q = q.filter(Locker.branch_id == user.branch_id)
    lockers = q.all()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    rq = db.query(LockerRequest)
    if user.role != "SUPER_ADMIN" and user.branch_id:
        rq = rq.join(Locker).filter(Locker.branch_id == user.branch_id)
    requests_all = rq.all()

    active_states = {"SUBMITTED", "VERIFICATION_PENDING", "TOKEN_A_VERIFIED", "TOKEN_B_VERIFIED", "APPROVAL_PENDING"}
    kpis = {
        "total_lockers": len(lockers),
        "occupied": sum(1 for l in lockers if l.status == "OCCUPIED"),
        "available": sum(1 for l in lockers if l.status == "AVAILABLE"),
        "active_requests": sum(1 for r in requests_all if r.status in active_states),
        "access_today": sum(1 for r in requests_all if r.status == "ACCESS_ACTIVE" or (r.completed_at and r.completed_at >= today_start)),
        "pending_verifications": sum(1 for r in requests_all if r.status == "VERIFICATION_PENDING"),
    }
    return success(kpis)


@router.get("/lockers", summary="Live visual vault grid data, with search/filter")
def list_lockers(
    branch_id: str | None = None,
    status: str | None = None,
    locker_size: str | None = None,
    search: str | None = None,
    user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    q = db.query(Locker)
    if user.role != "SUPER_ADMIN" and user.branch_id:
        q = q.filter(Locker.branch_id == user.branch_id)
    if branch_id:
        q = q.filter(Locker.branch_id == branch_id)
    if status:
        q = q.filter(Locker.status == status)
    if locker_size:
        q = q.filter(Locker.locker_size == locker_size)
    if search:
        q = q.filter(Locker.locker_number.ilike(f"%{search}%"))
    lockers = q.order_by(Locker.locker_number).all()
    return success([LockerOut.model_validate(l).model_dump() for l in lockers])


@router.get("/requests", summary="Request queue for bank staff")
def list_requests(
    status: str | None = None,
    user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    q = db.query(LockerRequest)
    if user.role != "SUPER_ADMIN" and user.branch_id:
        q = q.join(Locker).filter(Locker.branch_id == user.branch_id)
    if status:
        q = q.filter(LockerRequest.status == status)
    reqs = q.order_by(LockerRequest.requested_at.desc()).all()
    return success([LockerRequestOut.model_validate(r).model_dump() for r in reqs])


def _get_request_or_404(db: Session, request_id: str) -> LockerRequest:
    req = db.query(LockerRequest).filter(LockerRequest.id == request_id).first()
    if not req:
        raise ApiError("REQUEST_NOT_FOUND", "Request does not exist", 404)
    return req


@router.post("/requests/{request_id}/approve", summary="Approve a request awaiting approval")
def approve_request(request_id: str, user: User = Depends(require_staff), db: Session = Depends(get_db)):
    req = _get_request_or_404(db, request_id)
    req = transition_request(db, req, RequestStatus.APPROVED.value, user)
    req.approved_by = user.id
    db.commit()
    db.refresh(req)
    return success(LockerRequestOut.model_validate(req).model_dump(), "Request approved")


@router.post("/requests/{request_id}/reject", summary="Reject a request with a reason")
def reject_request(request_id: str, payload: RejectRequest, user: User = Depends(require_staff), db: Session = Depends(get_db)):
    req = _get_request_or_404(db, request_id)
    req.rejection_reason = payload.reason
    req = transition_request(db, req, RequestStatus.REJECTED.value, user, metadata={"reason": payload.reason})
    db.commit()
    db.refresh(req)
    return success(LockerRequestOut.model_validate(req).model_dump(), "Request rejected")


@router.post("/requests/{request_id}/start", summary="Start the operation (locker -> ACCESS_ACTIVE) after approval")
def start_operation(request_id: str, user: User = Depends(require_staff), db: Session = Depends(get_db)):
    req = _get_request_or_404(db, request_id)
    req = transition_request(db, req, RequestStatus.ACCESS_ACTIVE.value, user)
    transition_locker(db, req.locker, LockerStatus.ACCESS_ACTIVE.value, user, correlation_id=req.correlation_id)
    db.commit()
    db.refresh(req)
    return success(LockerRequestOut.model_validate(req).model_dump(), "Operation started — locker access active")


@router.post("/requests/{request_id}/complete", summary="Complete the operation (locker -> OCCUPIED)")
def complete_operation(request_id: str, user: User = Depends(require_staff), db: Session = Depends(get_db)):
    req = _get_request_or_404(db, request_id)
    req.completed_at = datetime.now(timezone.utc)
    req = transition_request(db, req, RequestStatus.COMPLETED.value, user)
    transition_locker(db, req.locker, LockerStatus.OCCUPIED.value, user, correlation_id=req.correlation_id)
    record_event(db, actor=user, action="OPERATION_COMPLETED", entity_type="LOCKER_REQUEST",
                 entity_id=req.id, correlation_id=req.correlation_id)
    db.commit()
    db.refresh(req)
    return success(LockerRequestOut.model_validate(req).model_dump(), "Operation completed")
