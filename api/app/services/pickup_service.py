from app.core.security import get_supabase_client
from fastapi import HTTPException

def _extract_single(item: object) -> dict:
    if isinstance(item, list):
        return item[0] if item else {}
    if isinstance(item, dict):
        return item
    return {}

async def update_pickup_weight(user_id: str, pickup_id: str, actual_tonnes: float, quality_notes: str | None = None) -> str:
    client = get_supabase_client()
    
    # 1. Check ownership (buyer of the pool)
    pickup_res = client.table("pickups").select("*, pools(buyer_id), listings(farmer_id, offers(price_per_tonne))").eq("id", pickup_id).single().execute()
    if not pickup_res.data:
        raise HTTPException(status_code=404, detail="Pickup not found")
        
    pools = _extract_single(pickup_res.data.get("pools"))
    if str(pools.get("buyer_id") or "") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    listings = _extract_single(pickup_res.data.get("listings"))
    offers_raw = listings.get("offers")
    offers = offers_raw if isinstance(offers_raw, list) else ([offers_raw] if offers_raw else [])
    first_offer = _extract_single(offers[0] if offers else {})
    price = float(first_offer.get("price_per_tonne") or 1500.0)
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

    farmer_id = listings.get("farmer_id")
    if farmer_id:
        try:
            client.table("notifications").insert({
                "profile_id": farmer_id,
                "message": f"💵 Instant Hand-to-Hand Payment of ₹{amount_due:,.2f} received for your {actual_tonnes} tonnes paddy straw pickup!",
                "read": False
            }).execute()
        except Exception:
            pass

        try:
            f_prof = client.table("profiles").select("phone").eq("id", farmer_id).limit(1).execute()
            if f_prof.data and f_prof.data[0].get("phone"):
                pay_wa_text = (
                    f"💵 ਭੁਗਤਾਨ ਮੁਕੰਮਲ! ਤੁਹਾਡੀ {actual_tonnes:.1f} ਟਨ ਪਰਾਲੀ ਦਾ ਕੁੱਲ ਭੁਗਤਾਨ ₹{amount_due:,.2f} ਜਾਰੀ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।\n"
                    "ਰਕਮ ਪ੍ਰਾਪਤ ਹੋਣ 'ਤੇ 'ਮਿਲ ਗਏ' ਲਿਖ ਕੇ ਪੁਸ਼ਟੀ ਕਰੋ।"
                )
                from app.services.whatsapp_service import send_whatsapp_message
                await send_whatsapp_message(f_prof.data[0]["phone"], pay_wa_text, farmer_id)
        except Exception:
            pass
    
    return str(pickup_res.data["listing_id"])

async def update_pickup_payment(user_id: str, pickup_id: str, payment_status: str) -> None:
    client = get_supabase_client()
    
    # 1. Check ownership (farmer of the listing)
    pickup_res = client.table("pickups").select("*, listings(farmer_id)").eq("id", pickup_id).single().execute()
    if not pickup_res.data:
        raise HTTPException(status_code=404, detail="Pickup not found")
        
    listings = _extract_single(pickup_res.data.get("listings"))
    if str(listings.get("farmer_id") or "") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client.table("pickups").update({
        "payment_status": payment_status
    }).eq("id", pickup_id).execute()
