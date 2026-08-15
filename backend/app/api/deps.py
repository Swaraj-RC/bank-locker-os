from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.core.responses import ApiError
from app.models import User


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ApiError("UNAUTHORIZED", "Missing or invalid Authorization header", 401)

    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise ApiError("INVALID_TOKEN", "Access token is invalid or expired", 401)

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise ApiError("USER_NOT_FOUND", "User associated with token no longer exists", 401)
    if user.status != "ACTIVE":
        raise ApiError("ACCOUNT_INACTIVE", "This account is not active", 403)

    return user


class RequireRoles:
    """Dependency factory enforcing RBAC at the backend — never trust the frontend."""

    def __init__(self, *roles: str):
        self.roles = set(roles)

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.roles:
            raise ApiError(
                "FORBIDDEN",
                f"Role '{user.role}' is not permitted to perform this action",
                403,
            )
        return user


require_customer = RequireRoles("CUSTOMER")
require_staff = RequireRoles("BANK_OPERATOR", "BRANCH_MANAGER", "SUPER_ADMIN")
require_manager = RequireRoles("BRANCH_MANAGER", "SUPER_ADMIN")
require_super_admin = RequireRoles("SUPER_ADMIN")
