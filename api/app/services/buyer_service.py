from typing import Any

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


async def procure_listing_direct(user_id: str, listing_id: str, offer_price: float = 1500.0) -> dict[str, Any]:
    import datetime
    client = get_supabase_client()
    l_res = client.table("listings").select("*, plots(*)").eq("id", listing_id).single().execute()
    if not l_res.data:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing = l_res.data
    farmer_id = listing.get("farmer_id")

    baler_res = client.table("balers").select("id").limit(1).execute()
    baler_id = baler_res.data[0]["id"] if baler_res.data else "33333333-3333-3333-3333-333333333331"

    today = datetime.date.today()
    offer_data = {
        "listing_id": listing_id,
        "buyer_id": user_id,
        "baler_id": baler_id,
        "price_per_tonne": offer_price,
        "pickup_start": (today + datetime.timedelta(days=2)).isoformat(),
        "pickup_end": (today + datetime.timedelta(days=7)).isoformat(),
        "status": "pending"
    }
    offer_res = client.table("offers").insert(offer_data).execute()

    client.table("listings").update({"status": "matched"}).eq("id", listing_id).execute()

    tonnes = listing.get("est_tonnes", 25.0)
    try:
        client.table("notifications").insert({
            "profile_id": farmer_id,
            "message": f"🎉 Factory Purchase Offer: An industrial biomass buyer has offered to procure your {tonnes}t paddy straw at ₹{offer_price:,.0f}/t!",
            "read": False
        }).execute()
        client.table("notifications").insert({
            "profile_id": user_id,
            "message": f"🛒 Procurement Initiated: Offer sent for {tonnes}t paddy straw from local field at ₹{offer_price:,.0f}/t.",
            "read": False
        }).execute()
    except Exception:
        pass

    return offer_res.data[0] if offer_res.data else {"status": "success"}
