from sqlalchemy.orm import Session

from app.models import AuditEvent, User


def record_event(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    previous_state: str | None = None,
    new_state: str | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
    correlation_id: str | None = None,
) -> AuditEvent:
    """
    Record an append-only audit event. Called by every service that performs
    a privileged or state-changing operation (auth, verification, locker
    state transitions, request approvals, etc.)
    """
    event = AuditEvent(
        actor_id=actor.id if actor else None,
        actor_role=actor.role if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        previous_state=previous_state,
        new_state=new_state,
        event_metadata=metadata or {},
        ip_address=ip_address,
        correlation_id=correlation_id,
    )
    db.add(event)
    db.flush()
    return event
