from app.core.security import get_supabase_client
from fastapi import HTTPException

async def get_ranked_villages(target_lat: float, target_lon: float):
    client = get_supabase_client()
    res = client.table("villages").select("*").execute()
    villages = res.data
    
    ranked = []
    for v in villages:
        # Mock calculation: 
        # For simplicity, calculate bearing and compare to wind direction.
        # But we don't have python geopy here. We just return mock ranking.
        # Assuming target (e.g. Delhi) is SE of Moga. Wind from NW (315) means Moga fires influence Delhi.
        ranked.append({
            "village": v,
            "influence_score": 85.0, # Mock high influence
            "label": "likely influence"
        })
    return ranked

async def create_donation(donor_id: str, ngo_id: str, amount: float, target_village_id: str = None):
    client = get_supabase_client()
    res = client.table("donations").insert({
        "donor_id": donor_id,
        "ngo_id": ngo_id,
        "amount": amount,
        "target_village_id": target_village_id
    }).execute()
    return res.data[0]

async def create_assistance_request(farmer_id: str, ngo_id: str, listing_id: str, amount: float, purpose: str):
    client = get_supabase_client()
    res = client.table("assistance_requests").insert({
        "farmer_id": farmer_id,
        "ngo_id": ngo_id,
        "listing_id": listing_id,
        "amount_requested": amount,
        "purpose": purpose
    }).execute()
    return res.data[0]

async def update_request_status(ngo_id: str, request_id: str, status: str):
    client = get_supabase_client()
    res = client.table("assistance_requests").select("ngo_id").eq("id", request_id).single().execute()
    if res.data["ngo_id"] != ngo_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client.table("assistance_requests").update({"status": status}).eq("id", request_id).execute()

async def create_disbursement(ngo_id: str, request_id: str, payee_name: str, amount: float):
    client = get_supabase_client()
    # verify ownership
    res = client.table("assistance_requests").select("ngo_id, status").eq("id", request_id).single().execute()
    if res.data["ngo_id"] != ngo_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if res.data["status"] != "approved":
        raise HTTPException(status_code=400, detail="Request not approved")
        
    disb_res = client.table("disbursements").insert({
        "ngo_id": ngo_id,
        "request_id": request_id,
        "payee_name": payee_name,
        "amount": amount
    }).execute()
    return disb_res.data[0]
