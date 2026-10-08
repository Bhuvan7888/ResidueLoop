from app.core.security import get_supabase_client
from fastapi import HTTPException
import uuid
import datetime

async def match_listing(user_id: str, listing_id: str) -> None:
    client = get_supabase_client()
    
    # Check ownership
    listing_res = client.table("listings").select("*, plots(*)").eq("id", listing_id).single().execute()
    if not listing_res.data or listing_res.data["plots"]["farmer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # MOCK DB logic:
    # 1. Fetch open demand_posts / buyers
    # 2. Score = weighted sum of distance, price, capacity
    # 3. Pick top buyer and baler
    
    # Mock finding a buyer and baler
    buyers_res = client.table("buyers").select("*").limit(1).execute()
    balers_res = client.table("balers").select("*").limit(1).execute()
    
    if not buyers_res.data or not balers_res.data:
        # Cannot match
        return
        
    buyer = buyers_res.data[0]
    baler = balers_res.data[0]
    
    # Insert into `offers`
    client.table("offers").insert({
        "listing_id": listing_id,
        "buyer_id": buyer["profile_id"],
        "baler_id": baler["id"],
        "status": "pending",
        "price_per_tonne": buyer["price_per_tonne"]
    }).execute()
    
    # Mark listing as matched
    client.table("listings").update({"status": "matched"}).eq("id", listing_id).execute()

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
    
    from app.core.config import get_settings
    # For now, hardcode min load as 8 if config not available in db
    min_load = 8.0 
    
    if pool_res.data:
        pool = pool_res.data[0]
        new_tonnes = pool["current_tonnes"] + est_tonnes
        status = "ready" if new_tonnes >= min_load else "forming"
        pickup_date = (datetime.datetime.now() + datetime.timedelta(days=3)).strftime("%Y-%m-%d") if status == "ready" else None
        
        client.table("pools").update({
            "current_tonnes": new_tonnes,
            "status": status,
            "pickup_date": pickup_date
        }).eq("id", pool["id"]).execute()
        pool_id = pool["id"]
    else:
        status = "ready" if est_tonnes >= min_load else "forming"
        pickup_date = (datetime.datetime.now() + datetime.timedelta(days=3)).strftime("%Y-%m-%d") if status == "ready" else None
        
        # We need a dummy village_id since it's a UUID, mock it if not present
        pool_village_id = village_id if village_id else str(uuid.uuid4())
        
        new_pool = client.table("pools").insert({
            "village_id": pool_village_id,
            "buyer_id": buyer_id,
            "baler_id": baler_id,
            "status": status,
            "target_tonnes": min_load,
            "current_tonnes": est_tonnes,
            "pickup_date": pickup_date
        }).execute()
        pool_id = new_pool.data[0]["id"]
        
    # Link listing to pool
    client.table("listings").update({"pool_id": pool_id, "status": "pooled"}).eq("id", offer["listing_id"]).execute()

async def decline_offer(user_id: str, offer_id: str) -> None:
    client = get_supabase_client()
    
    offer_res = client.table("offers").select("*, listings(plots(farmer_id))").eq("id", offer_id).single().execute()
    if not offer_res.data or offer_res.data["listings"]["plots"]["farmer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client.table("offers").update({"status": "declined"}).eq("id", offer_id).execute()
    client.table("listings").update({"status": "open"}).eq("id", offer_res.data["listing_id"]).execute()
