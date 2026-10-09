from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import date
from app.core.security import require_role
from app.services.listing_service import create_listing

router = APIRouter(prefix="/listings", tags=["listings"])

class ListingCreate(BaseModel):
    plot_id: str
    harvest_date: date
    combine_sms_used: bool
    est_tonnes: float

@router.post("")
async def add_listing(
    listing: ListingCreate,
    user_id: str = Depends(require_role(["farmer"]))
):
    listing_id = await create_listing(user_id, listing)
    return {"data": {"id": listing_id}}
