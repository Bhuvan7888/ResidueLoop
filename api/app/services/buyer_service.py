from fastapi import HTTPException, status

from app.core.security import get_supabase_client
from app.repositories.market_repository import MarketRepository
from app.schemas.market import BuyerProfileCreate, DemandPostCreate, DemandPostUpdate


def point_wkt(lng: float, lat: float) -> str:
    return f"SRID=4326;POINT({lng} {lat})"


async def create_buyer_profile(user_id: str, profile_data: BuyerProfileCreate) -> None:
    repository = MarketRepository(get_supabase_client())
    repository.upsert_buyer(
        user_id,
        {
            "org_name": profile_data.org_name,
            "type": profile_data.type,
            "location": point_wkt(profile_data.lng, profile_data.lat),
            "capacity": profile_data.capacity,
            "price_per_tonne": profile_data.price_per_tonne,
            "min_load_tonnes": profile_data.min_load_tonnes,
        },
    )


async def create_demand_post(user_id: str, post_data: DemandPostCreate) -> str:
    repository = MarketRepository(get_supabase_client())
    return repository.create_demand(
        user_id,
        {
            "tonnes_needed": post_data.tonnes_needed,
            "price_per_tonne": post_data.price_per_tonne,
            "location": point_wkt(post_data.lng, post_data.lat),
            "date_from": post_data.date_from.isoformat(),
            "date_to": post_data.date_to.isoformat(),
        },
    )


async def update_demand_post(user_id: str, post_id: str, update_data: DemandPostUpdate) -> None:
    repository = MarketRepository(get_supabase_client())
    if repository.get_demand_owner(post_id) != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demand post not found")
    payload = update_data.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided")
    repository.update_demand(post_id, payload)
