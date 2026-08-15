from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.responses import success, ApiError
from app.api.deps import require_staff
from app.models import User, AuditEvent
from app.schemas.domain import AuditEventOut

router = APIRouter(prefix="/api/v1/audit", tags=["Compliance & Audit"])


@router.get("", summary="Query the audit trail with filters (date, actor, role, entity, action)")
def list_audit_events(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    actor_id: str | None = None,
    actor_role: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    action: str | None = None,
    correlation_id: str | None = None,
    limit: int = Query(default=200, le=1000),
    user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    q = db.query(AuditEvent)
    if date_from:
        q = q.filter(AuditEvent.created_at >= date_from)
    if date_to:
        q = q.filter(AuditEvent.created_at <= date_to)
    if actor_id:
        q = q.filter(AuditEvent.actor_id == actor_id)
    if actor_role:
        q = q.filter(AuditEvent.actor_role == actor_role)
    if entity_type:
        q = q.filter(AuditEvent.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditEvent.entity_id == entity_id)
    if action:
        q = q.filter(AuditEvent.action == action)
    if correlation_id:
        q = q.filter(AuditEvent.correlation_id == correlation_id)

    events = q.order_by(AuditEvent.created_at.desc()).limit(limit).all()
    return success([AuditEventOut.model_validate(e).model_dump() for e in events])


@router.get("/{event_id}", summary="Get a single audit event")
def get_audit_event(event_id: str, user: User = Depends(require_staff), db: Session = Depends(get_db)):
    event = db.query(AuditEvent).filter(AuditEvent.id == event_id).first()
    if not event:
        raise ApiError("AUDIT_EVENT_NOT_FOUND", "Audit event does not exist", 404)
    return success(AuditEventOut.model_validate(event).model_dump())


@router.get("/timeline/{correlation_id}", summary="Full chronological timeline for one request (correlation_id)")
def timeline(correlation_id: str, user: User = Depends(require_staff), db: Session = Depends(get_db)):
    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.correlation_id == correlation_id)
        .order_by(AuditEvent.created_at.asc())
        .all()
    )
    return success([AuditEventOut.model_validate(e).model_dump() for e in events])
