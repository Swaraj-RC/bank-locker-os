from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.responses import success, ApiError
from app.api.deps import require_staff, get_current_user
from app.models import User, LockerRequest
from app.schemas.domain import VerifyTokenRequest, LockerRequestOut
from app.services import verification_service

router = APIRouter(prefix="/api/v1/verification", tags=["Dual-Token Verification"])


def _get_request(db: Session, request_id: str) -> LockerRequest:
    req = db.query(LockerRequest).filter(LockerRequest.id == request_id).first()
    if not req:
        raise ApiError("REQUEST_NOT_FOUND", "Request does not exist", 404)
    return req


@router.post("/{request_id}/generate", summary="Bank staff generates the CUSTOMER_TOKEN + BANK_TOKEN pair")
def generate(request_id: str, user: User = Depends(require_staff), db: Session = Depends(get_db)):
    req = _get_request(db, request_id)
    result = verification_service.generate_verification_pair(db, req, user)
    return success(result, "Verification tokens generated (demo values shown for hackathon judging)")


@router.post("/{request_id}/verify/customer", summary="Verify the CUSTOMER_TOKEN")
def verify_customer(request_id: str, payload: VerifyTokenRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = _get_request(db, request_id)
    if user.role == "CUSTOMER" and req.customer_id != user.id:
        raise ApiError("FORBIDDEN", "You cannot verify this request", 403)
    req = verification_service.verify_customer_token(db, req, payload.token, user)
    return success(LockerRequestOut.model_validate(req).model_dump(), "Customer token verified")


@router.post("/{request_id}/verify/bank", summary="Bank operator verifies the BANK_TOKEN (completes dual control)")
def verify_bank(request_id: str, payload: VerifyTokenRequest, user: User = Depends(require_staff), db: Session = Depends(get_db)):
    req = _get_request(db, request_id)
    req = verification_service.verify_bank_token(db, req, payload.token, user)
    return success(LockerRequestOut.model_validate(req).model_dump(), "Bank authorization verified — ACCESS AUTHORIZED")
