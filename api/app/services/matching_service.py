from app.core.security import get_supabase_client
from app.core.config import get_settings
from fastapi import HTTPException
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
        
    # 2. Weighted scoring for buyers
    # Score = w_price * norm(price) + w_dist * (1 - norm(dist)) + w_cap * norm(cap)
    best_buyer = None
    best_buyer_score = -float("inf")

    w_dist = settings.matching_weight_distance
    w_price = settings.matching_weight_price
    w_cap = settings.matching_weight_capacity

    for b in buyers_res.data:
        b_lat = float(b.get("lat") or 30.8)
        b_lng = float(b.get("lng") or 75.2)
        dist = _calculate_distance_km(plot_lat, plot_lon, b_lat, b_lng)
        # Normalize: distance (assume max 100km), price (assume range 1000-3000), capacity (50-500)
        norm_dist = min(dist / 100.0, 1.0)
        norm_price = min(max((float(b.get("price_per_tonne") or 1500) - 1000) / 2000.0, 0.0), 1.0)
        norm_cap = min(float(b.get("capacity") or 100) / 500.0, 1.0)

        score = (w_price * norm_price) + (w_dist * (1.0 - norm_dist)) + (w_cap * norm_cap)
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

    # 4. Insert into `offers`
    client.table("offers").insert({
        "listing_id": listing_id,
        "buyer_id": buyer["profile_id"],
        "baler_id": baler["id"],
        "status": "pending",
        "price_per_tonne": buyer["price_per_tonne"],
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

    # Notify farmer about matched buyer
    try:
        client.table("notifications").insert({
            "profile_id": user_id,
            "message": f"✨ Your listing of {est_t:.1f} tonnes has matched with {buyer.get('org_name', 'Biomass Buyer')} at ₹{buyer['price_per_tonne']}/tonne!",
            "read": False
        }).execute()
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

            # Notify each pooled farmer
            if pl.get("farmer_id"):
                try:
                    client.table("notifications").insert({
                        "profile_id": pl["farmer_id"],
                        "message": f"🎉 Your village straw pool has reached target capacity! Scheduled pickup date fixed for {pickup_date}.",
                        "read": False
                    }).execute()
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
