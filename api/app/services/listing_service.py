from fastapi import HTTPException, status

from app.core.security import get_supabase_client
from app.repositories.market_repository import MarketRepository
from app.schemas.market import ListingCreate


async def create_listing(user_id: str, listing_data: ListingCreate) -> str:
    repository = MarketRepository(get_supabase_client())
    if repository.get_farmer_status(user_id) != "verified":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verified ID is required")
    if not repository.owns_plot(user_id, listing_data.plot_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plot not found")
    listing_id = repository.create_listing(
        user_id,
        {
            "plot_id": listing_data.plot_id,
            "harvest_date": listing_data.harvest_date.isoformat(),
            "combine_sms_used": listing_data.combine_sms_used,
            "est_tonnes": listing_data.est_tonnes,
        },
    )
    from app.services.matching_service import match_listing

    await match_listing(user_id, listing_id)
    return listing_id
