from typing import Any, Optional
from fastapi import APIRouter, Depends
from app.core.security import require_role
from app.services.buyer_service import (
    create_buyer_profile,
    create_demand_post,
    update_demand_post,
    procure_listing_direct,
    get_demand_posts_for_buyer,
)
from app.schemas.market import BuyerProfileCreate, DemandPostCreate, DemandPostUpdate

router = APIRouter(prefix="/buyers", tags=["buyers"])

@router.get("/demand")
async def list_demand_posts(
    user_id: str = Depends(require_role(["buyer"]))
) -> dict[str, Any]:
    items = await get_demand_posts_for_buyer(user_id)
    return {"data": items}

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

@router.post("/procure/{listing_id}")
async def procure_listing(
    listing_id: str,
    payload: Optional[dict[str, Any]] = None,
    user_id: str = Depends(require_role(["buyer"]))
) -> dict[str, Any]:
    offer_price = (payload or {}).get("offer_price", 1500.0) if payload else 1500.0
    res = await procure_listing_direct(user_id, listing_id, float(offer_price))
    return {"data": res}

