from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.core.security import require_role
from app.services import listing_service

router = APIRouter(prefix="/listings", tags=["listings"])


class ListingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plot_id: str
    harvest_date: date
    combine_sms_used: bool
    est_tonnes: float | None = Field(default=None, gt=0)


@router.post("")
def add_listing(listing: ListingCreate, user_id: str = Depends(require_role(["farmer"]))) -> dict[str, object]:
    created = listing_service.create_listing(
        user_id, listing.plot_id, listing.harvest_date, listing.combine_sms_used, listing.est_tonnes
    )
    return {"data": created}
