from app.core.security import get_supabase_client
from app.core.config import get_settings
from fastapi import HTTPException
from typing import Any
import uuid
import datetime
import math

def _calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Haversine distance
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

async def match_listing(user_id: str, listing_id: str) -> None:
    client = get_supabase_client()
    settings = get_settings()
    
    # Check ownership
    listing_res = client.table("listings").select("*, plots(*)").eq("id", listing_id).single().execute()
    if not listing_res.data or listing_res.data["plots"]["farmer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    plot = listing_res.data["plots"]
    harvest_date_str = listing_res.data.get("harvest_date")
    try:
        plot_lon, plot_lat = plot.get("centre", {}).get("coordinates", [75.2, 30.8])
    except Exception:
        plot_lat, plot_lon = 30.8, 75.2

    # 1. Fetch available buyers & balers
    buyers_res = client.table("buyers").select("*").execute()
    balers_res = client.table("balers").select("*").execute()
    
    if not buyers_res.data or not balers_res.data:
        # Cannot match
        return

    # Parse stubble form, quality and intended purpose metadata
    raw_source = listing_res.data.get("source") or "web"
    meta: dict[str, Any] = {}
    import json
    if isinstance(raw_source, str) and raw_source.startswith("{"):
        try:
            meta = json.loads(raw_source)
        except Exception:
            pass

    combine_sms = bool(listing_res.data.get("combine_sms_used"))
    stubble_form = meta.get("stubble_form") or ("delivered_bales" if combine_sms else "farm_gate_loose")
    intended_purposes = meta.get("intended_purposes") or (
        ["paper_mill", "biomass_plant"] if combine_sms else ["biomass_plant", "brick_kiln"]
    )
    quality_grade = meta.get("quality_grade") or ("grade_a_sms" if combine_sms else "grade_b")

    form_benchmarks = {
        "farm_gate_loose": 600.0,
        "brick_kiln": 1000.0,
        "delivered_bales": 1850.0,
        "processed_pellets": 4800.0,
        "commercial_feed_grade": 5500.0,
    }
    benchmark_price = form_benchmarks.get(stubble_form, 1850.0 if combine_sms else 600.0)
        
    # 2. Purpose-Driven Weighted scoring for buyers
    # Score = w_price * norm(price) + w_dist * (1 - norm(dist)) + w_cap * norm(cap) + w_purpose * affinity
    best_buyer = None
    best_buyer_score = -float("inf")

    w_dist = settings.matching_weight_distance
    w_price = settings.matching_weight_price
    w_cap = settings.matching_weight_capacity

    for b in buyers_res.data:
        b_lat = float(b.get("lat") or 30.8)
        b_lng = float(b.get("lng") or 75.2)
        b_type = str(b.get("type") or "biomass")
        dist = _calculate_distance_km(plot_lat, plot_lon, b_lat, b_lng)

        # Check industry purpose affinity
        affinity = 0.2
        if b_type == "mill" and (stubble_form == "delivered_bales" or "paper_mill" in intended_purposes or "packaging" in intended_purposes):
            affinity = 1.0
        elif b_type == "biomass" and ("biomass_plant" in intended_purposes or "ntpc_tender" in intended_purposes or stubble_form in ("processed_pellets", "farm_gate_loose")):
            affinity = 1.0
        elif b_type == "kiln" and ("brick_kiln" in intended_purposes or stubble_form == "brick_kiln"):
            affinity = 1.0
        elif b_type == "cbg" and ("cbg_plant" in intended_purposes or stubble_form == "farm_gate_loose"):
            affinity = 1.0
        elif "cattle_feed" in intended_purposes and quality_grade in ("grade_a_plus", "commercial_feed"):
            affinity = 0.9

        # Normalize metrics
        norm_dist = min(dist / 100.0, 1.0)
        buyer_price = float(b.get("price_per_tonne") or benchmark_price)
        norm_price = min(max((buyer_price - 500.0) / 4500.0, 0.0), 1.0)
        norm_cap = min(float(b.get("capacity") or 100) / 500.0, 1.0)

        score = (w_price * norm_price) + (w_dist * (1.0 - norm_dist)) + (w_cap * norm_cap) + (0.35 * affinity)
        if score > best_buyer_score:
            best_buyer_score = score
            best_buyer = b

    buyer = best_buyer or buyers_res.data[0]
    baler = balers_res.data[0]
    
    # 3. Calculate pickup window based on harvest date
    try:
        h_date = datetime.datetime.strptime(harvest_date_str, "%Y-%m-%d").date()
    except Exception:
        h_date = datetime.date.today() + datetime.timedelta(days=7)

    pickup_start = (h_date + datetime.timedelta(days=2)).isoformat()
    pickup_end = (h_date + datetime.timedelta(days=5)).isoformat()

    # Fair offer price calibrated by stubble form
    offer_price = benchmark_price if float(buyer.get("price_per_tonne") or 0) <= 0 else float(buyer.get("price_per_tonne") or benchmark_price)

    # 4. Insert into `offers`
    client.table("offers").insert({
        "listing_id": listing_id,
        "buyer_id": buyer["profile_id"],
        "baler_id": baler["id"],
        "status": "pending",
        "price_per_tonne": offer_price,
        "pickup_start": pickup_start,
        "pickup_end": pickup_end
    }).execute()
    
    # Mark listing as matched
    client.table("listings").update({"status": "matched"}).eq("id", listing_id).execute()

    # Notify buyer about nearby farmer listing
    est_t = float(listing_res.data.get("est_tonnes", 0))
    try:
        client.table("notifications").insert({
            "profile_id": buyer["profile_id"],
            "message": f"🌾 Nearby Stubble Alert: Farmer has listed {est_t:.1f} tonnes of paddy straw nearby! Offer generated at ₹{buyer['price_per_tonne']}/tonne.",
            "read": False
        }).execute()
    except Exception:
        pass

    # Notify farmer about matched buyer (Web + WhatsApp)
    try:
        client.table("notifications").insert({
            "profile_id": user_id,
            "message": f"✨ Your listing of {est_t:.1f} tonnes has matched with {buyer.get('org_name', 'Biomass Buyer')} at ₹{offer_price:,.0f}/tonne!",
            "read": False
        }).execute()
    except Exception:
        pass

    try:
        farmer_prof = client.table("profiles").select("phone").eq("id", user_id).limit(1).execute()
        if farmer_prof.data and farmer_prof.data[0].get("phone"):
            farmer_phone = farmer_prof.data[0]["phone"]
            total_val = est_t * offer_price
            buyer_org = buyer.get("org_name", "ਬਾਇਓਮਾਸ ਪਲਾਂਟ (Biomass Buyer)")
            wa_text = (
                f"🎉 ਖੁਸ਼ਖਬਰੀ! ਤੁਹਾਡੀ {est_t:.1f} ਟਨ ਪਰਾਲੀ ਲਈ ਖਰੀਦਦਾਰ '{buyer_org}' ਨੇ ਪੇਸ਼ਕਸ਼ ਕੀਤੀ ਹੈ:\n"
                f"💰 ਰੇਟ: ₹{offer_price:,.0f} / ਟਨ\n"
                f"💵 ਕੁੱਲ ਰਕਮ: ₹{total_val:,.0f}\n"
                f"🗓️ ਪਿਕਅੱਪ ਵਿੰਡੋ: {pickup_start} ਤੋਂ {pickup_end}\n\n"
                "ਕੀ ਤੁਸੀਂ ਇਹ ਪੇਸ਼ਕਸ਼ ਸਵੀਕਾਰ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? ਸਵੀਕਾਰ ਕਰਨ ਲਈ 'ਹਾਂ' ਜਾਂ 'ACCEPT' ਲਿਖ ਕੇ ਜਵਾਬ ਦਿਓ।"
            )
            from app.services.whatsapp_service import send_whatsapp_message
            await send_whatsapp_message(farmer_phone, wa_text, user_id)
    except Exception:
        pass

async def accept_offer(user_id: str, offer_id: str) -> None:
    client = get_supabase_client()
    
    # Check ownership and fetch offer
    offer_res = client.table("offers").select("*, listings(est_tonnes, plots(village_id, farmer_id))").eq("id", offer_id).single().execute()
    if not offer_res.data or offer_res.data["listings"]["plots"]["farmer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    offer = offer_res.data
    
    # Update offer status to 'accepted'
    client.table("offers").update({"status": "accepted"}).eq("id", offer_id).execute()
    
    village_id = offer["listings"]["plots"].get("village_id")
    buyer_id = offer["buyer_id"]
    baler_id = offer["baler_id"]
    est_tonnes = offer["listings"]["est_tonnes"]
    
    # Find open pool for buyer in village
    pool_res = client.table("pools").select("*").eq("buyer_id", buyer_id).eq("village_id", village_id).in_("status", ["forming"]).execute()
    
    # Derive pool target load from buyer capacity/min_load_tonnes so multiple farmers can be pooled
    buyer_info = client.table("buyers").select("min_load_tonnes, capacity").eq("profile_id", buyer_id).execute()
    if buyer_info.data and buyer_info.data[0].get("min_load_tonnes"):
        target_load = float(buyer_info.data[0]["min_load_tonnes"])
    else:
        target_load = 25.0
    
    if pool_res.data:
        pool = pool_res.data[0]
        new_tonnes = float(pool["current_tonnes"]) + float(est_tonnes)
        status = "ready" if new_tonnes >= target_load else "forming"
        pickup_date = (datetime.datetime.now() + datetime.timedelta(days=3)).strftime("%Y-%m-%d") if status == "ready" else None
        
        client.table("pools").update({
            "current_tonnes": new_tonnes,
            "status": status,
            "pickup_date": pickup_date
        }).eq("id", pool["id"]).execute()
        pool_id = pool["id"]
    else:
        status = "ready" if est_tonnes >= target_load else "forming"
        pickup_date = (datetime.datetime.now() + datetime.timedelta(days=3)).strftime("%Y-%m-%d") if status == "ready" else None
        
        pool_village_id = village_id if village_id else str(uuid.uuid4())
        
        new_pool = client.table("pools").insert({
            "village_id": pool_village_id,
            "buyer_id": buyer_id,
            "baler_id": baler_id,
            "status": status,
            "target_tonnes": target_load,
            "current_tonnes": est_tonnes,
            "pickup_date": pickup_date
        }).execute()
        pool_id = new_pool.data[0]["id"]
        
    # Link listing to pool
    client.table("listings").update({"pool_id": pool_id, "status": "pooled"}).eq("id", offer["listing_id"]).execute()

    if status == "ready":
        # Create/ensure pickups for all listings belonging to this ready pool
        pool_listings = client.table("listings").select("id, farmer_id").eq("pool_id", pool_id).execute()
        for pl in pool_listings.data or []:
            client.table("pickups").upsert({
                "pool_id": pool_id,
                "listing_id": pl["id"],
                "baler_id": baler_id,
                "payment_status": "pending"
            }, on_conflict="listing_id").execute()

            # Notify each pooled farmer (Web + WhatsApp)
            if pl.get("farmer_id"):
                try:
                    client.table("notifications").insert({
                        "profile_id": pl["farmer_id"],
                        "message": f"🎉 Your village straw pool has reached target capacity! Scheduled pickup date fixed for {pickup_date}.",
                        "read": False
                    }).execute()
                except Exception:
                    pass

                try:
                    f_prof = client.table("profiles").select("phone").eq("id", pl["farmer_id"]).limit(1).execute()
                    if f_prof.data and f_prof.data[0].get("phone"):
                        f_phone = f_prof.data[0]["phone"]
                        pool_wa_text = (
                            f"🚛 ਖੁਸ਼ਖਬਰੀ! ਤੁਹਾਡੇ ਪਿੰਡ ਦਾ ਪਰਾਲੀ ਪੂਲ ਪੂਰਾ ਹੋ ਗਿਆ ਹੈ।\n"
                            f"ਤੁਹਾਡੀ ਪਿਕਅੱਪ ਮਿਤੀ {pickup_date} ਤੈਅ ਹੋਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਖੇਤ ਵਿੱਚ ਟਰਾਲੀ ਤਿਆਰ ਰੱਖੋ।"
                        )
                        from app.services.whatsapp_service import send_whatsapp_message
                        await send_whatsapp_message(f_phone, pool_wa_text, pl["farmer_id"])
                except Exception:
                    pass

        # Notify buyer
        try:
            client.table("notifications").insert({
                "profile_id": buyer_id,
                "message": f"🚛 Village Straw Pool Ready! Target load met. Scheduled pickup fixed for {pickup_date}.",
                "read": False
            }).execute()
        except Exception:
            pass

async def decline_offer(user_id: str, offer_id: str) -> None:
    client = get_supabase_client()
    
    offer_res = client.table("offers").select("*, listings(plots(farmer_id))").eq("id", offer_id).single().execute()
    if not offer_res.data or offer_res.data["listings"]["plots"]["farmer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client.table("offers").update({"status": "declined"}).eq("id", offer_id).execute()
    client.table("listings").update({"status": "open"}).eq("id", offer_res.data["listing_id"]).execute()
