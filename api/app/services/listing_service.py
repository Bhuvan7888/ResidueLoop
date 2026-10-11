from typing import Any

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


async def get_all_listings(farmer_id: str | None = None, status_filter: str | None = None) -> list[dict[str, Any]]:
    client = get_supabase_client()
    query = client.table("listings").select(
        "id, farmer_id, plot_id, harvest_date, combine_sms_used, est_tonnes, status, created_at, source, "
        "plots(id, acres, village_id, villages(id, name, district, geometry)), "
        "offers(id, price_per_tonne, status, balers(name), buyers(org_name))"
    ).order("created_at", desc=True)
    if farmer_id:
        query = query.eq("farmer_id", farmer_id)
    if status_filter:
        query = query.eq("status", status_filter)
    res = query.execute()
    listings = res.data or []

    # Enhance with farmer profile name and buyer procurement intelligence
    for listing_item in listings:
        f_id = listing_item.get("farmer_id")
        if f_id:
            try:
                prof = client.table("profiles").select("name, phone").eq("id", f_id).limit(1).execute()
                listing_item["farmer_name"] = prof.data[0]["name"] if prof.data else "Local Farmer"
                listing_item["farmer_phone"] = prof.data[0]["phone"] if prof.data else None
            except Exception:
                listing_item["farmer_name"] = "Local Farmer"

        # Calculate pricing and baler details
        offers = listing_item.get("offers") or []
        price_per_tonne = 1500.0
        baler_name = "Regional Straw Balers"
        buyer_org = None
        for o in offers:
            if o.get("price_per_tonne"):
                price_per_tonne = float(o["price_per_tonne"])
            if o.get("balers") and isinstance(o["balers"], dict) and o["balers"].get("name"):
                baler_name = o["balers"]["name"]
            if o.get("buyers") and isinstance(o["buyers"], dict) and o["buyers"].get("org_name"):
                buyer_org = o["buyers"]["org_name"]

        tonnes = float(listing_item.get("est_tonnes") or 0.0)
        total_price = round(tonnes * price_per_tonne, 2)
        listing_item["price_per_tonne"] = price_per_tonne
        listing_item["total_price"] = total_price
        listing_item["baler_name"] = baler_name
        listing_item["buyer_org"] = buyer_org

        # Village details helper
        plot = listing_item.get("plots") or {}
        village = plot.get("villages") or {}
        listing_item["village_name"] = village.get("name", "Moga District")
        listing_item["district"] = village.get("district", "Punjab")
        listing_item["acres"] = float(plot.get("acres") or round(tonnes / 2.5, 1))

        # Procurement evaluation
        combine_sms = bool(listing_item.get("combine_sms_used"))
        current_status = listing_item.get("status", "open")

        if current_status in ("pooled", "completed"):
            decision = "avoid"
            badge = "Already Locked / Pooled"
            reasons = [
                "This stubble lot is already committed in an active village pool or completed.",
                "Not available for independent purchase."
            ]
        elif combine_sms:
            decision = "buy"
            badge = "Recommended to Buy"
            reasons = [
                "Harvester SMS equipped: finely chopped stubble, optimal combustion efficiency.",
                f"Fair rate of ₹{price_per_tonne:,.0f}/tonne matches regional biomass market index.",
                f"Clean straw with low moisture, baler ready by {baler_name}."
            ]
        else:
            decision = "caution"
            badge = "Buy with Caution"
            reasons = [
                "Combine SMS not used: uncut stubble clumps require additional rake pre-processing.",
                "Potential moisture & dirt risk during baling. Recommend ₹100-₹150/t processing markdown.",
                f"Offered at ₹{price_per_tonne:,.0f}/tonne."
            ]

        listing_item["procurement_advice"] = {
            "decision": decision,
            "badge": badge,
            "reasons": reasons,
            "quality_grade": "Grade A (SMS Chopped)" if combine_sms else "Grade B (Standard Straw)",
            "benchmark_diff": "At Regional Benchmark" if price_per_tonne == 1500 else ("Below Benchmark" if price_per_tonne < 1500 else "Above Benchmark")
        }

    return listings
