from typing import Any
from fastapi import APIRouter, Depends
from app.core.security import require_role
from app.services.listing_service import create_listing
from app.schemas.market import ListingCreate

router = APIRouter(prefix="/listings", tags=["listings"])

@router.post("")
async def add_listing(
    listing: ListingCreate,
    user_id: str = Depends(require_role(["farmer"]))
) -> dict[str, Any]:
    listing_id = await create_listing(user_id, listing)
    return {"data": {"id": listing_id}}
