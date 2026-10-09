from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.core.security import require_role
from app.services import buyer_service

router = APIRouter(prefix="/buyers", tags=["buyers"])


class BuyerProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    org_name: str = Field(min_length=1, max_length=120)
    type: Literal["biomass", "cbg", "kiln", "mill"]
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    capacity: int = Field(gt=0)
    price_per_tonne: float = Field(gt=0)
    min_load_tonnes: float = Field(default=8.0, gt=0)


class DemandPostCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tonnes_needed: float = Field(gt=0)
    price_per_tonne: float = Field(gt=0)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    date_from: date
    date_to: date


class DemandPostUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tonnes_needed: float | None = Field(default=None, gt=0)
    price_per_tonne: float | None = Field(default=None, gt=0)
    status: Literal["open", "fulfilled", "closed"] | None = None


@router.post("/profile")
def create_profile(profile: BuyerProfileCreate, user_id: str = Depends(require_role(["buyer"]))) -> dict[str, str]:
    buyer_service.create_buyer_profile(
        user_id,
        profile.org_name,
        profile.type,
        profile.lat,
        profile.lng,
        profile.capacity,
        profile.price_per_tonne,
        profile.min_load_tonnes,
    )
    return {"data": "success"}


@router.post("/demand")
def add_demand_post(post: DemandPostCreate, user_id: str = Depends(require_role(["buyer"]))) -> dict[str, object]:
    post_id = buyer_service.create_demand_post(
        user_id, post.tonnes_needed, post.price_per_tonne, post.lat, post.lng, post.date_from, post.date_to
    )
    return {"data": {"id": post_id}}


@router.patch("/demand/{post_id}")
def update_demand(
    post_id: str, update: DemandPostUpdate, user_id: str = Depends(require_role(["buyer"]))
) -> dict[str, str]:
    buyer_service.update_demand_post(user_id, post_id, update.model_dump(exclude_none=True))
    return {"data": "success"}
