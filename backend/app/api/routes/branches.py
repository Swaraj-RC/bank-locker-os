from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.responses import success, ApiError
from app.api.deps import get_current_user
from app.models import User, Branch
from app.schemas.domain import BranchOut

router = APIRouter(prefix="/api/v1/branches", tags=["Branches"])


@router.get("", summary="List all branches")
def list_branches(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    branches = db.query(Branch).order_by(Branch.name).all()
    return success([BranchOut.model_validate(b).model_dump() for b in branches])


@router.get("/{branch_id}", summary="Get a single branch")
def get_branch(branch_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise ApiError("BRANCH_NOT_FOUND", "Branch does not exist", 404)
    return success(BranchOut.model_validate(branch).model_dump())
