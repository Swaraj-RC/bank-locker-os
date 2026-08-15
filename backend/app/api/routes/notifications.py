from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.responses import success, ApiError
from app.api.deps import get_current_user
from app.models import User, Notification

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get("", summary="List the current user's notifications")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    from app.schemas.domain import NotificationOut
    return success([NotificationOut.model_validate(n).model_dump() for n in notifs])


@router.post("/{notification_id}/read", summary="Mark a notification as read")
def mark_read(notification_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if not notif:
        raise ApiError("NOTIFICATION_NOT_FOUND", "Notification does not exist", 404)
    notif.read = True
    db.commit()
    return success(None, "Notification marked as read")
