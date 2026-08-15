from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.responses import success, ApiError
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.models import User
from app.schemas.auth import LoginRequest, RefreshRequest, UserOut
from app.services.audit_service import record_event

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post("/login", summary="Authenticate and receive an access/refresh token pair")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        if user:
            record_event(db, actor=user, action="LOGIN_FAILED", entity_type="USER", entity_id=user.id,
                         ip_address=request.client.host if request.client else None)
            db.commit()
        raise ApiError("INVALID_CREDENTIALS", "Email or password is incorrect", 401)

    if user.status != "ACTIVE":
        raise ApiError("ACCOUNT_INACTIVE", "This account is not active", 403)

    access = create_access_token(user.id, user.role)
    refresh = create_refresh_token(user.id, user.role)

    record_event(db, actor=user, action="LOGIN_SUCCESS", entity_type="USER", entity_id=user.id,
                 ip_address=request.client.host if request.client else None)
    db.commit()

    return success({
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": UserOut.model_validate(user).model_dump(),
    }, "Login successful")


@router.post("/refresh", summary="Exchange a refresh token for a new access token")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise ApiError("INVALID_TOKEN", "Refresh token is invalid or expired", 401)

    user = db.query(User).filter(User.id == data["sub"]).first()
    if not user or user.status != "ACTIVE":
        raise ApiError("ACCOUNT_INACTIVE", "Account is not available", 403)

    access = create_access_token(user.id, user.role)
    return success({"access_token": access, "token_type": "bearer"}, "Token refreshed")


@router.post("/logout", summary="Logout (client discards tokens; event is audited)")
def logout(request: Request, db: Session = Depends(get_db)):
    # Stateless JWT: logout is enforced client-side + audited server-side.
    record_event(db, actor=None, action="LOGOUT", entity_type="USER",
                 ip_address=request.client.host if request.client else None)
    db.commit()
    return success(None, "Logged out")
