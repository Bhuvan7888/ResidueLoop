from app.core.security import get_supabase_client
from fastapi import HTTPException
from typing import Any, cast
import datetime
import math

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))

async def get_ranked_villages(target_lat: float, target_lon: float) -> list[dict[str, Any]]:
    client = get_supabase_client()
    res = client.table("villages").select("*").execute()
    villages = res.data or []
    
    ranked = []
    for v in villages:
        v_lat = float(v.get("lat") or v.get("latitude") or 30.5)
        v_lon = float(v.get("lon") or v.get("longitude") or 75.5)
        dist = haversine_km(v_lat, v_lon, target_lat, target_lon)
        score = round(max(30.0, min(99.0, 96.0 - (dist * 0.12))), 1)
        if score >= 80.0:
            label = "High Direct Impact"
        elif score >= 60.0:
            label = "Moderate Influence"
        else:
            label = "Low Exposure"
        ranked.append({
            "village": v,
            "influence_score": score,
            "label": label,
            "distance_km": round(dist, 1)
        })
    ranked.sort(key=lambda x: x["influence_score"], reverse=True)
    return ranked

async def get_crowdfunding_campaigns() -> list[dict[str, Any]]:
    client = get_supabase_client()
    
    # 1. Fetch available NGO
    ngo_res = client.table("ngos").select("profile_id, profiles(name)").limit(1).execute()
    default_ngo_id = ngo_res.data[0]["profile_id"] if ngo_res.data else "b65cf486-a94a-4f49-8807-8da7b4b00eee"
    default_ngo_name = ngo_res.data[0]["profiles"]["name"] if (ngo_res.data and ngo_res.data[0].get("profiles")) else "Punjab Clean Air Action Foundation"

    # 2. Check for unsold open listings that need to be listed for charity crowdfunding (> 2-3 days unsold or open)
    listings_res = client.table("listings").select(
        "id, farmer_id, est_tonnes, status, created_at, plots(acres, village_id, villages(name))"
    ).eq("status", "open").execute()

    now = datetime.datetime.now(datetime.timezone.utc)
    for listing in listings_res.data or []:
        created_at_str = listing.get("created_at")
        try:
            created_dt = datetime.datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            age_days = (now - created_dt).total_seconds() / 86400.0
        except Exception:
            age_days = 2.5

        # Check if an assistance request already exists for this listing
        existing_req = client.table("assistance_requests").select("id").eq("listing_id", listing["id"]).execute()
        if not existing_req.data:
            # Auto-list onto charity crowdfunding
            acres = float(listing.get("plots", {}).get("acres", 10.0))
            amount_needed = acres * 500.0
            try:
                # Ensure farmer record exists for FK
                client.table("farmers").upsert({"profile_id": listing["farmer_id"]}, on_conflict="profile_id").execute()
                client.table("assistance_requests").insert({
                    "farmer_id": listing["farmer_id"],
                    "ngo_id": default_ngo_id,
                    "listing_id": listing["id"],
                    "amount_requested": amount_needed,
                    "purpose": f"Emergency Citizen Clearance: Unsold Paddy Stubble at Fire Risk ({acres:.1f} acres)",
                    "status": "pending"
                }).execute()

                client.table("notifications").insert({
                    "profile_id": listing["farmer_id"],
                    "message": f"🛡️ Notice: Your unsold stubble from {acres:.1f} acres has been listed on the Clean Air Charity Crowdfunding Portal to prevent field burning.",
                    "read": False
                }).execute()
            except Exception as e:
                print(f"Error auto-listing stubble to charity: {e}")

    # 3. Fetch all assistance requests
    req_res = client.table("assistance_requests").select(
        "*, ngos(profile_id, profiles(name)), listings(id, est_tonnes, status, created_at, plots(acres, village_id, villages(name)))"
    ).order("created_at", desc=True).execute()

    campaigns = []
    for req in req_res.data or []:
        farmer_prof = client.table("profiles").select("name").eq("id", req["farmer_id"]).execute()
        farmer_name = farmer_prof.data[0]["name"] if farmer_prof.data else "Local Farmer"

        listing = req.get("listings") or {}
        plot = listing.get("plots") or {}
        village = plot.get("villages") or {}

        acres = float(plot.get("acres") or 10.0)
        est_tonnes = float(listing.get("est_tonnes") or (acres * 2.5))
        village_name = village.get("name") or "Moga District"

        # Calculate funded amount for this village or campaign
        village_id = plot.get("village_id")
        donations_query = client.table("donations").select("amount")
        if village_id:
            donations_query = donations_query.eq("target_village_id", village_id)
        else:
            donations_query = donations_query.eq("ngo_id", req["ngo_id"])
        donations = donations_query.execute()
        funded = sum(float(d.get("amount", 0)) for d in (donations.data or []))

        campaigns.append({
            "id": req["id"],
            "listing_id": req["listing_id"],
            "farmer_id": req["farmer_id"],
            "farmer_name": farmer_name,
            "village_name": village_name,
            "target_village_id": village_id,
            "ngo_id": req["ngo_id"],
            "ngo_name": req.get("ngos", {}).get("profiles", {}).get("name") or default_ngo_name,
            "acres": acres,
            "est_tonnes": est_tonnes,
            "amount_requested": float(req["amount_requested"]),
            "amount_funded": funded,
            "purpose": req["purpose"],
            "status": req["status"],
            "created_at": req["created_at"],
            "fire_risk": "critical" if req["status"] == "pending" else "resolved",
        })

    return campaigns

async def create_donation(
    donor_id: str,
    ngo_id: str,
    amount: float,
    target_village_id: str | None = None,
    campaign_id: str | None = None,
) -> dict[str, Any]:
    client = get_supabase_client()
    
    # If campaign_id provided, look up target village and request
    if campaign_id:
        req_res = client.table("assistance_requests").select("*, listings(plots(village_id))").eq("id", campaign_id).execute()
        if req_res.data:
            req = req_res.data[0]
            if not ngo_id:
                ngo_id = req["ngo_id"]
            if not target_village_id:
                target_village_id = req.get("listings", {}).get("plots", {}).get("village_id")

    # If ngo_id is missing, fallback to first available
    if not ngo_id:
        ngo_res = client.table("ngos").select("profile_id").limit(1).execute()
        if ngo_res.data:
            ngo_id = ngo_res.data[0]["profile_id"]

    res = client.table("donations").insert({
        "donor_id": donor_id,
        "ngo_id": ngo_id,
        "amount": amount,
        "target_village_id": target_village_id
    }).execute()
    donation = cast(dict[str, Any], res.data[0])

    # Send donor notification
    try:
        client.table("notifications").insert({
            "profile_id": donor_id,
            "message": f"🎉 Thank you for contributing ₹{amount:,.2f}! You helped save a field from burning and protected regional air quality.",
            "read": False
        }).execute()
    except Exception:
        pass

    # If campaign_id provided, notify farmer and update progress
    if campaign_id:
        try:
            req_res = client.table("assistance_requests").select("*, listings(id, plots(acres))").eq("id", campaign_id).execute()
            if req_res.data:
                req = req_res.data[0]
                farmer_id = req["farmer_id"]
                client.table("notifications").insert({
                    "profile_id": farmer_id,
                    "message": f"🌱 Citizen Crowdfunding Update: A donor just contributed ₹{amount:,.2f} towards clearing your stubble cleanly!",
                    "read": False
                }).execute()

                # If goal reached, update request to approved and listing to completed
                donations = client.table("donations").select("amount").eq("target_village_id", target_village_id).execute()
                total_donated = sum(float(d.get("amount", 0)) for d in (donations.data or []))
                if total_donated >= float(req["amount_requested"]):
                    client.table("assistance_requests").update({"status": "approved"}).eq("id", campaign_id).execute()
                    client.table("listings").update({"status": "completed"}).eq("id", req["listing_id"]).execute()
                    client.table("notifications").insert({
                        "profile_id": farmer_id,
                        "message": f"🚜 Field Cleared! Your stubble clearance has been 100% crowdfunded by citizens. Balers are dispatched to clear your field cleanly!",
                        "read": False
                    }).execute()
        except Exception:
            pass

    return donation

async def create_assistance_request(
    farmer_id: str, ngo_id: str | None, listing_id: str, amount: float, purpose: str
) -> dict[str, Any]:
    client = get_supabase_client()
    if not ngo_id:
        ngo_res = client.table("ngos").select("profile_id").limit(1).execute()
        if ngo_res.data:
            ngo_id = ngo_res.data[0]["profile_id"]
        else:
            ngo_id = "b65cf486-a94a-4f49-8807-8da7b4b00eee"

    # Ensure farmer record exists for FK
    client.table("farmers").upsert({"profile_id": farmer_id}, on_conflict="profile_id").execute()

    res = client.table("assistance_requests").insert({
        "farmer_id": farmer_id,
        "ngo_id": ngo_id,
        "listing_id": listing_id,
        "amount_requested": amount,
        "purpose": purpose
    }).execute()
    return cast(dict[str, Any], res.data[0])

async def update_request_status(ngo_id: str, request_id: str, status: str) -> None:
    client = get_supabase_client()
    res = client.table("assistance_requests").select("ngo_id").eq("id", request_id).single().execute()
    if res.data["ngo_id"] != ngo_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client.table("assistance_requests").update({"status": status}).eq("id", request_id).execute()

async def create_disbursement(
    ngo_id: str, request_id: str, payee_name: str, amount: float, payee_type: str = "baler", note: str | None = None
) -> dict[str, Any]:
    client = get_supabase_client()
    res = client.table("assistance_requests").select("ngo_id, status").eq("id", request_id).single().execute()
    if res.data["ngo_id"] != ngo_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if res.data["status"] != "approved":
        raise HTTPException(status_code=400, detail="Request not approved")
        
    disb_res = client.table("disbursements").insert({
        "ngo_id": ngo_id,
        "request_id": request_id,
        "payee_name": payee_name,
        "amount": amount,
        "payee_type": payee_type,
        "note": note or f"Clearance disbursement to {payee_type}"
    }).execute()
    return cast(dict[str, Any], disb_res.data[0])
