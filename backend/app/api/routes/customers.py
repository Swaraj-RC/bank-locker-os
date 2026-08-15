from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.responses import success
from app.api.deps import require_customer
from app.models import User, Locker, LockerRequest
from app.schemas.auth import UserOut
from app.schemas.domain import LockerOut, LockerRequestOut

router = APIRouter(prefix="/api/v1/customers", tags=["Customers"])


@router.get("/me", summary="Get the logged-in customer's profile")
def get_me(user: User = Depends(require_customer)):
    return success(UserOut.model_validate(user).model_dump())


@router.get("/me/locker", summary="Get the customer's assigned locker")
def get_my_locker(user: User = Depends(require_customer), db: Session = Depends(get_db)):
    locker = db.query(Locker).filter(Locker.customer_id == user.id).first()
    if not locker:
        return success(None, "No locker assigned")
    return success(LockerOut.model_validate(locker).model_dump())


@router.get("/me/requests", summary="Get the customer's locker requests")
def get_my_requests(user: User = Depends(require_customer), db: Session = Depends(get_db)):
    reqs = (
        db.query(LockerRequest)
        .filter(LockerRequest.customer_id == user.id)
        .order_by(LockerRequest.requested_at.desc())
        .all()
    )
    return success([LockerRequestOut.model_validate(r).model_dump() for r in reqs])
