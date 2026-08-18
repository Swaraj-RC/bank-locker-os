from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.responses import success, ApiError
from app.api.deps import require_staff, get_current_user
from app.models import User, LockerRequest
from app.schemas.domain import VerifyTokenRequest, LockerRequestOut, FaceVerifyRequest, FaceVerificationOut
from app.services import verification_service, face_verification_service

router = APIRouter(prefix="/api/v1/verification", tags=["Face Verification"])


def _get_request(db: Session, request_id: str) -> LockerRequest:
    req = db.query(LockerRequest).filter(LockerRequest.id == request_id).first()
    if not req:
        raise ApiError("REQUEST_NOT_FOUND", "Request does not exist", 404)
    return req


@router.post(
    "/{request_id}/face-verify",
    summary="Bank staff submits a webcam capture for biometric face verification",
)
def face_verify(
    request_id: str,
    payload: FaceVerifyRequest,
    user: User = Depends(require_staff),
    db: Session = Depends(get_db),
    x_mock_face_result: str | None = Header(default=None, alias="X-Mock-Face-Result"),
):
    """Staff-side face verification endpoint.

    Accepts a base64-encoded webcam capture. Runs face matching against customer's
    registered Project NPN embedding, evaluates confidence and anti-spoof liveness,
    authorizes locker access, and records audit logs.
    """
    mock_override = payload.mock_override or x_mock_face_result

    try:
        fv = face_verification_service.submit_face_verification(
            db=db,
            request_id=request_id,
            image_data=payload.image,
            actor=user,
            blink_image_data=payload.blink_frame,
            nod_image_data=payload.nod_frame,
            mock_override=mock_override,
        )
        req = _get_request(db, request_id)
    except ApiError as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": {"code": exc.code, "message": exc.message}},
        )

    status_msg = "Face verification succeeded — access authorized" if fv.face_match else "Face verification failed"
    return success(
        {
            "verification": FaceVerificationOut.model_validate(fv).model_dump(),
            "request": LockerRequestOut.model_validate(req).model_dump(),
        },
        status_msg,
    )
