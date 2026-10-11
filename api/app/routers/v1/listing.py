from typing import Any, Optional
from fastapi import APIRouter, Depends
from app.core.security import require_role
from app.services.listing_service import create_listing, get_all_listings, delete_listing
from app.schemas.market import ListingCreate

router = APIRouter(prefix="/listings", tags=["listings"])

@router.get("")
async def list_listings(
    farmer_id: Optional[str] = None,
    status: Optional[str] = None,
) -> dict[str, Any]:
    items = await get_all_listings(farmer_id=farmer_id, status_filter=status)
    return {"data": items}

@router.post("")
async def add_listing(
    listing: ListingCreate,
    user_id: str = Depends(require_role(["farmer"]))
) -> dict[str, Any]:
    listing_id = await create_listing(user_id, listing)
    return {"data": {"id": listing_id}}

@router.delete("/{listing_id}")
async def remove_listing(
    listing_id: str,
    user_id: str = Depends(require_role(["farmer"]))
) -> dict[str, Any]:
    await delete_listing(user_id, listing_id)
    return {"data": {"deleted": True, "id": listing_id}}

