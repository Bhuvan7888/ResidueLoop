from app.core.security import get_supabase_client
from fastapi import HTTPException

async def update_pickup_weight(user_id: str, pickup_id: str, actual_tonnes: float) -> str:
    client = get_supabase_client()
    
    # 1. Check ownership (buyer of the pool)
    pickup_res = client.table("pickups").select("*, pools(buyer_id), listings(offers(price_per_tonne))").eq("id", pickup_id).single().execute()
    if not pickup_res.data or pickup_res.data["pools"]["buyer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    price = pickup_res.data["listings"]["offers"][0]["price_per_tonne"]
    amount_due = actual_tonnes * price
    
    client.table("pickups").update({
        "actual_tonnes": actual_tonnes,
        "amount_due": amount_due,
        "completed_at": "now()"
    }).eq("id", pickup_id).execute()
    
    return str(pickup_res.data["listing_id"])

async def update_pickup_payment(user_id: str, pickup_id: str, payment_status: str) -> None:
    client = get_supabase_client()
    
    # 1. Check ownership (farmer of the listing)
    pickup_res = client.table("pickups").select("*, listings(farmer_id)").eq("id", pickup_id).single().execute()
    if not pickup_res.data or pickup_res.data["listings"]["farmer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client.table("pickups").update({
        "payment_status": payment_status
    }).eq("id", pickup_id).execute()
