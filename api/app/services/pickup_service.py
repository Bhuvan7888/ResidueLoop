from app.core.security import get_supabase_client
from fastapi import HTTPException

async def update_pickup_weight(user_id: str, pickup_id: str, actual_tonnes: float, quality_notes: str | None = None) -> str:
    client = get_supabase_client()
    
    # 1. Check ownership (buyer of the pool)
    pickup_res = client.table("pickups").select("*, pools(buyer_id), listings(farmer_id, offers(price_per_tonne))").eq("id", pickup_id).single().execute()
    if not pickup_res.data or pickup_res.data["pools"]["buyer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    offers = pickup_res.data.get("listings", {}).get("offers", [])
    price = offers[0]["price_per_tonne"] if offers else 1500.0
    amount_due = actual_tonnes * price
    
    update_data = {
        "actual_tonnes": actual_tonnes,
        "amount_due": amount_due,
        "completed_at": "now()",
        "payment_status": "received"
    }
    if quality_notes:
        update_data["quality_notes"] = quality_notes

    client.table("pickups").update(update_data).eq("id", pickup_id).execute()

    farmer_id = pickup_res.data.get("listings", {}).get("farmer_id")
    if farmer_id:
        try:
            client.table("notifications").insert({
                "profile_id": farmer_id,
                "message": f"💵 Instant Hand-to-Hand Payment of ₹{amount_due:,.2f} received for your {actual_tonnes} tonnes paddy straw pickup!",
                "read": False
            }).execute()
        except Exception:
            pass
    
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
