from app.core.security import get_supabase_client
from fastapi import HTTPException
import uuid

async def create_listing(user_id: str, listing_data: object) -> str:
    client = get_supabase_client()
    
    # 1. Check if farmer is verified
    response = client.table("farmers").select("id_status").eq("profile_id", user_id).execute()
    # In mock mode, if table doesn't exist yet or fails, we might just pass or fail.
    # We will raise HTTPException if they are not verified.
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=403, detail="Farmer profile not found or unverified")
        
    farmer_record = response.data[0]
    if farmer_record.get("id_status") != "verified":
        raise HTTPException(status_code=403, detail="You must be verified to create a listing")
        
    # 2. Estimate bounds check (handled in UI, but could be validated here)
    # The config values are 2 to 3 tonnes per acre, but we accept what the UI sends as est_tonnes for now.

    # MOCK DB logic to insert listing
    return str(uuid.uuid4())
