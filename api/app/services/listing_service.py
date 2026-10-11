from typing import Any

from fastapi import HTTPException, status

from app.core.security import get_supabase_client
from app.repositories.market_repository import MarketRepository
from app.schemas.market import ListingCreate


import json

async def create_listing(user_id: str, listing_data: ListingCreate) -> str:
    repository = MarketRepository(get_supabase_client())
    if repository.get_farmer_status(user_id) != "verified":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verified ID is required")
    if not repository.owns_plot(user_id, listing_data.plot_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plot not found")

    purposes = listing_data.intended_purposes
    if isinstance(purposes, str):
        purposes = [p.strip() for p in purposes.split(",") if p.strip()]
    elif not purposes:
        purposes = ["paper_mill", "biomass_plant"] if listing_data.combine_sms_used else ["biomass_plant", "brick_kiln"]

    quality_grade = listing_data.quality_grade or ("grade_a_sms" if listing_data.combine_sms_used else "grade_b")
    stubble_form = listing_data.stubble_form or ("delivered_bales" if listing_data.combine_sms_used else "farm_gate_loose")

    form_benchmarks = {
        "farm_gate_loose": 600.0,
        "brick_kiln": 1000.0,
        "delivered_bales": 1850.0,
        "processed_pellets": 4800.0,
        "commercial_feed_grade": 5500.0,
    }
    benchmark_rate = form_benchmarks.get(stubble_form, 1850.0 if listing_data.combine_sms_used else 600.0)

    meta_payload = json.dumps({
        "channel": "web",
        "quality_grade": quality_grade,
        "stubble_form": stubble_form,
        "intended_purposes": purposes,
        "moisture_level": listing_data.moisture_level or ("12-15%" if listing_data.combine_sms_used else "15-20%"),
        "expected_price_per_tonne": float(listing_data.expected_price_per_tonne or benchmark_rate),
    })

    listing_id = repository.create_listing(
        user_id,
        {
            "plot_id": listing_data.plot_id,
            "harvest_date": listing_data.harvest_date.isoformat(),
            "combine_sms_used": listing_data.combine_sms_used,
            "est_tonnes": listing_data.est_tonnes,
            "source": meta_payload,
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

    # Real-world Punjab stubble market benchmark tiers by source & form
    form_benchmarks = {
        "farm_gate_loose": {
            "name": "Direct Farm-Gate Loose Straw",
            "range": "₹500 to ₹700/t (₹170-₹300/qtl)",
            "benchmark": 600.0,
            "description": "Direct farm pickup for power companies & biomass plants.",
        },
        "brick_kiln": {
            "name": "Brick Kilns & Industrial Use",
            "range": "₹600 to ₹1,400/t",
            "benchmark": 1000.0,
            "description": "Fuel replacement for local kilns & industrial boilers.",
        },
        "delivered_bales": {
            "name": "Delivered Bales (15–50 km)",
            "range": "₹1,330 to ₹3,000/t",
            "benchmark": 1850.0,
            "description": "Baled with cutting, storage, and short haul transport to paper mills.",
        },
        "processed_pellets": {
            "name": "Processed Pellets & Briquettes",
            "range": "₹4,320 to ₹5,500+/t",
            "benchmark": 4800.0,
            "description": "NTPC co-firing power tender & industrial briquette standard.",
        },
        "commercial_feed_grade": {
            "name": "Commercial / Cattle Feed Bales",
            "range": "₹4,800 to ₹8,500/t (₹2-₹28/kg)",
            "benchmark": 5500.0,
            "description": "Premium dairy fodder & clean animal feed via industrial platforms.",
        },
    }

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

        # Parse structured metadata from source column
        raw_source = listing_item.get("source") or "web"
        meta: dict[str, Any] = {}
        if isinstance(raw_source, str) and raw_source.startswith("{"):
            try:
                meta = json.loads(raw_source)
            except Exception:
                pass

        if meta.get("farmer_name"):
            listing_item["farmer_name"] = meta["farmer_name"]
            if meta.get("farmer_phone"):
                listing_item["farmer_phone"] = meta["farmer_phone"]

        combine_sms = bool(listing_item.get("combine_sms_used"))
        quality_grade = meta.get("quality_grade") or ("grade_a_sms" if combine_sms else "grade_b")
        stubble_form = meta.get("stubble_form") or ("delivered_bales" if combine_sms else "farm_gate_loose")
        intended_purposes = meta.get("intended_purposes") or (
            ["paper_mill", "biomass_plant", "packaging"] if combine_sms else ["biomass_plant", "brick_kiln"]
        )
        moisture_level = meta.get("moisture_level") or ("12-15%" if combine_sms else "15-20%")

        tier_info = form_benchmarks.get(stubble_form, form_benchmarks["delivered_bales" if combine_sms else "farm_gate_loose"])
        benchmark_rate = float(tier_info["benchmark"])

        listing_item["quality_grade"] = quality_grade
        listing_item["stubble_form"] = stubble_form
        listing_item["stubble_form_name"] = tier_info["name"]
        listing_item["market_price_range"] = tier_info["range"]
        listing_item["intended_purposes"] = intended_purposes
        listing_item["moisture_level"] = moisture_level

        # Calculate pricing and baler details
        offers = listing_item.get("offers") or []
        price_per_tonne = benchmark_rate
        baler_name = "Regional Straw Balers"
        buyer_org = None
        for o in offers:
            if o.get("price_per_tonne"):
                price_per_tonne = float(o["price_per_tonne"])
            if o.get("balers") and isinstance(o["balers"], dict) and o["balers"].get("name"):
                baler_name = o["balers"]["name"]
            if o.get("buyers") and isinstance(o["buyers"], dict) and o["buyers"].get("org_name"):
                buyer_org = o["buyers"]["org_name"]

        # Ensure realistic pricing by form: farm-gate loose cannot be priced at delivered bale rates
        if stubble_form == "farm_gate_loose" or not combine_sms:
            price_per_tonne = min(price_per_tonne, 700.0)
        elif stubble_form == "brick_kiln":
            price_per_tonne = min(max(price_per_tonne, 600.0), 1200.0)
        else:
            price_per_tonne = max(price_per_tonne, 1330.0)

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

        # Realistic acreage: In Punjab, 1 acre produces ~2.5 tonnes of paddy straw
        plot_acres = float(plot.get("acres") or 0.0)
        listing_item["acres"] = round(tonnes / 2.5, 1) if tonnes > 0 else (plot_acres or 5.0)

        # Coordinates from village PostGIS geometry
        geom = village.get("geometry") or {}
        coords = geom.get("coordinates") if isinstance(geom, dict) else None
        if coords and len(coords) >= 2:
            listing_item["lng"] = float(coords[0])
            listing_item["lat"] = float(coords[1])
        else:
            listing_item["lng"] = 75.17
            listing_item["lat"] = 30.82

        # Procurement evaluation matching market source & form
        current_status = listing_item.get("status", "open")

        if current_status in ("pooled", "completed"):
            decision = "avoid"
            badge = "Already Locked / Pooled"
            reasons = [
                "This stubble lot is already committed in an active village pool or completed.",
                "Not available for independent purchase."
            ]
        elif quality_grade in ("grade_a_plus", "commercial_feed") or "cattle_feed" in intended_purposes:
            decision = "buy"
            badge = "Prime Feed Grade (Top Recommendation)"
            reasons = [
                f"Commercial cattle feed grade: ultra-clean, dry ({moisture_level} moisture), zero mold.",
                f"High value market tier: {tier_info['range']}.",
                f"Offered at ₹{price_per_tonne:,.0f}/t vs benchmark ₹{benchmark_rate:,.0f}/t for {tier_info['name']}."
            ]
        elif combine_sms or stubble_form == "delivered_bales":
            decision = "buy"
            badge = "Recommended to Buy"
            reasons = [
                f"Form: {tier_info['name']} ({tier_info['range']}).",
                "Finely chopped combine SMS straw, optimal for baling and boiler combustion.",
                f"Offered at ₹{price_per_tonne:,.0f}/t (Benchmark: ₹{benchmark_rate:,.0f}/t). Baler: {baler_name}."
            ]
        elif stubble_form == "brick_kiln" or "brick_kiln" in meta.get("intended_purposes", []):
            decision = "caution"
            badge = "Industrial / Brick Kiln Grade"
            reasons = [
                f"Suitable for brick kilns and local industrial furnaces ({tier_info['range']}).",
                f"Offered at ₹{price_per_tonne:,.0f}/t.",
                "Recommend testing ash content before high-pressure boiler usage."
            ]
        else:
            decision = "caution"
            badge = "Buy with Caution"
            reasons = [
                f"Direct farm-gate loose straw ({tier_info['range']}): buyer provides in-field collection.",
                "Uncut stubble clumps require additional rake pre-processing.",
                f"Offered at ₹{price_per_tonne:,.0f}/t."
            ]

        listing_item["procurement_advice"] = {
            "decision": decision,
            "badge": badge,
            "reasons": reasons,
            "quality_grade": (
                "Grade A+ (Premium Golden Feed)" if quality_grade in ("grade_a_plus", "commercial_feed")
                else ("Grade A (SMS Chopped Bales)" if combine_sms
                else "Grade B (Standard Straw)")
            ),
            "stubble_form": tier_info["name"],
            "market_range": tier_info["range"],
            "benchmark_diff": (
                "At Market Benchmark" if price_per_tonne == benchmark_rate
                else ("Below Market Benchmark (Good Value)" if price_per_tonne < benchmark_rate
                else "Above Market Benchmark")
            )
        }

    return listings


async def delete_listing(user_id: str, listing_id: str) -> None:
    repository = MarketRepository(get_supabase_client())
    repository.delete_listing(user_id, listing_id)

