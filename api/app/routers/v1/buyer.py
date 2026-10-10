from typing import Any
from fastapi import APIRouter, Depends
from app.core.security import require_role
from app.services.buyer_service import create_buyer_profile, create_demand_post, update_demand_post
from app.schemas.market import BuyerProfileCreate, DemandPostCreate, DemandPostUpdate

router = APIRouter(prefix="/buyers", tags=["buyers"])

@router.post("/profile")
async def create_profile(
    profile: BuyerProfileCreate,
    user_id: str = Depends(require_role(["buyer"]))
) -> dict[str, Any]:
    await create_buyer_profile(user_id, profile)
    return {"data": "success"}

@router.post("/demand")
async def add_demand_post(
    post: DemandPostCreate,
    user_id: str = Depends(require_role(["buyer"]))
) -> dict[str, Any]:
    post_id = await create_demand_post(user_id, post)
    return {"data": {"id": post_id}}

@router.patch("/demand/{post_id}")
async def update_demand(
    post_id: str,
    update_data: DemandPostUpdate,
    user_id: str = Depends(require_role(["buyer"]))
) -> dict[str, Any]:
    await update_demand_post(user_id, post_id, update_data)
    return {"data": "success"}
