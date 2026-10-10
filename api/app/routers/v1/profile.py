from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.core.security import AuthenticatedUser, get_current_user
from app.services.profile_service import create_profile

router = APIRouter(prefix="/profiles", tags=["profiles"])


class ProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["farmer", "buyer", "donor"]


@router.post("", status_code=201)
async def create_first_profile(
    payload: ProfileCreate,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, object]:
    return {"data": create_profile(user.id, user.phone, payload.role)}
