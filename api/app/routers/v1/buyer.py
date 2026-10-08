from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import date
from app.core.security import require_role
from app.services.buyer_service import create_buyer_profile, create_demand_post, update_demand_post

router = APIRouter(prefix="/buyers", tags=["buyers"])

class BuyerProfileCreate(BaseModel):
    org_name: str
    type: str
    lat: float
    lng: float
    capacity: int
    price_per_tonne: float
    min_load_tonnes: float = 8.0

class DemandPostCreate(BaseModel):
    tonnes_needed: float
    price_per_tonne: float
    lat: float
    lng: float
    date_from: date
    date_to: date

class DemandPostUpdate(BaseModel):
    tonnes_needed: float | None = None
    price_per_tonne: float | None = None
    status: str | None = None

@router.post("/profile")
async def create_profile(
    profile: BuyerProfileCreate,
    user_id: str = Depends(require_role(["buyer"]))
):
    await create_buyer_profile(user_id, profile)
    return {"data": "success"}

@router.post("/demand")
async def add_demand_post(
    post: DemandPostCreate,
    user_id: str = Depends(require_role(["buyer"]))
):
    post_id = await create_demand_post(user_id, post)
    return {"data": {"id": post_id}}

@router.patch("/demand/{post_id}")
async def update_demand(
    post_id: str,
    update_data: DemandPostUpdate,
    user_id: str = Depends(require_role(["buyer"]))
):
    await update_demand_post(user_id, post_id, update_data)
    return {"data": "success"}
