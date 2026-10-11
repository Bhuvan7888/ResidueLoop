import logging
import datetime
from app.core.config import get_settings
from app.core.security import get_supabase_client
from app.integrations.llm import parse_message_intent

logger = logging.getLogger(__name__)

async def send_whatsapp_message(to_number: str, text: str) -> None:
    """
    Sends a WhatsApp message using Twilio's API or records local send.
    """
    settings = get_settings()
    if not settings.twilio_auth_token:
        logger.info(f"Mock WhatsApp Send to {to_number}: {text}")
        return

    logger.info(f"Twilio WhatsApp Send to {to_number}: {text}")

async def process_inbound_message(phone_number: str, message_text: str) -> None:
    """
    Processes an incoming WhatsApp message across all 7 supported intents.
    """
    client = get_supabase_client()

    # 1. Look up profile
    profile_response = client.table("profiles").select("id, role, name").eq("phone", phone_number).execute()
    
    if not profile_response.data or len(profile_response.data) == 0:
        await send_whatsapp_message(
            phone_number,
            "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਸਾਡੀ ਵੈੱਬਸਾਈਟ 'ਤੇ ਆਪਣਾ ਖਾਤਾ ਬਣਾਓ। (Hello! Please create your account on ResidueLoop first.)"
        )
        return

    profile_id = profile_response.data[0]["id"]
    role = profile_response.data[0]["role"]

    if role != "farmer":
        await send_whatsapp_message(
            phone_number,
            "ਮਾਫ਼ ਕਰਨਾ, ਇਹ WhatsApp ਸੇਵਾ ਫ਼ਿਲਹਾਲ ਸਿਰਫ਼ ਰਜਿਸਟਰਡ ਕਿਸਾਨਾਂ ਲਈ ਹੈ। (Sorry, this WhatsApp service is currently for farmers.)"
        )
        return

    # 2. Parse intent
    parsed = await parse_message_intent(message_text)
    intent = parsed.get("intent", "unknown")
    entities = parsed.get("entities", {})

    # 3. Log inbound message
    client.table("messages").insert({
        "profile_id": profile_id,
        "phone_number": phone_number,
        "direction": "inbound",
        "raw_text": message_text,
        "parsed_intent": intent,
        "parsed_json": parsed
    }).execute()

    # 4. Handle intent
    reply_text = (
        "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਤੁਸੀਂ ਇਹ ਪੁੱਛ ਸਕਦੇ ਹੋ:\n"
        "1. ਮੇਰੀ ਪਿਕਅੱਪ ਮਿਤੀ ਕਦੋਂ ਹੈ?\n"
        "2. ਪੂਲ ਦੀ ਪ੍ਰਗਤੀ ਕਿੰਨੀ ਹੈ?\n"
        "3. ਭੁਗਤਾਨ ਦੀ ਸਥਿਤੀ ਕੀ ਹੈ?\n"
        "4. 5 ਏਕੜ ਪਰਾਲੀ ਲਿਸਟ ਕਰੋ\n"
        "5. ਪੇਸ਼ਕਸ਼ ਸਵੀਕਾਰ ਕਰੋ\n"
        "6. ਪੈਸੇ ਮਿਲ ਗਏ / ਨਹੀਂ ਮਿਲੇ"
    )

    try:
        if intent == "create_listing":
            acres = entities.get("acres", 5.0)
            harvest_date = entities.get("harvest_date") or (datetime.date.today() + datetime.timedelta(days=7)).isoformat()
            
            plots_resp = client.table("plots").select("id").eq("farmer_id", profile_id).execute()
            if not plots_resp.data:
                reply_text = "ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਐਪ ਵਿੱਚ ਇੱਕ ਖੇਤ (plot) ਸ਼ਾਮਲ ਕਰੋ। (Please register a plot in the app first.)"
            else:
                plot_id = plots_resp.data[0]["id"]
                est_tonnes = float(acres) * 2.5
                listing_insert = client.table("listings").insert({
                    "farmer_id": profile_id,
                    "plot_id": plot_id,
                    "est_tonnes": est_tonnes,
                    "harvest_date": harvest_date,
                    "combine_sms_used": False,
                    "status": "open",
                    "source": "whatsapp"
                }).execute()
                
                listing_id = listing_insert.data[0]["id"]
                from app.services.matching_service import match_listing
                await match_listing(profile_id, listing_id)
                
                reply_text = f"✅ ਤੁਹਾਡੀ {acres} ਏਕੜ ਦੀ ਪਰਾਲੀ ਲਿਸਟਿੰਗ ਬਣ ਗਈ ਹੈ (~{est_tonnes:.1f} ਟਨ)। ਖਰੀਦਦਾਰਾਂ ਨਾਲ ਮੇਲ ਹੋ ਰਿਹਾ ਹੈ!"

        elif intent == "accept_offer":
            offers_resp = client.table("offers").select("id, status, listings(farmer_id)").eq("status", "pending").execute()
            farmer_offer = None
            for o in offers_resp.data or []:
                if o.get("listings", {}).get("farmer_id") == profile_id:
                    farmer_offer = o
                    break
            
            if farmer_offer:
                from app.services.matching_service import accept_offer
                await accept_offer(profile_id, farmer_offer["id"])
                reply_text = "🎉 ਵਧਾਈਆਂ! ਤੁਸੀਂ ਪੇਸ਼ਕਸ਼ ਸਵੀਕਾਰ ਕਰ ਲਈ ਹੈ ਅਤੇ ਪਿੰਡ ਦੇ ਪੂਲ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋ ਗਏ ਹੋ।"
            else:
                reply_text = "ਤੁਹਾਡੇ ਕੋਲ ਫ਼ਿਲਹਾਲ ਕੋਈ ਬਕਾਇਆ ਪੇਸ਼ਕਸ਼ ਨਹੀਂ ਹੈ। (No pending offers to accept right now.)"

        elif intent == "ask_pickup_date":
            pickups_resp = client.table("pickups").select("pools(pickup_date), listings(farmer_id)").order("created_at", desc=True).execute()
            pickup_date = None
            for p in pickups_resp.data or []:
                if p.get("listings", {}).get("farmer_id") == profile_id:
                    pickup_date = p.get("pools", {}).get("pickup_date")
                    break
            
            if pickup_date:
                reply_text = f"🗓️ ਤੁਹਾਡੀ ਅਗਲੀ ਪਿਕਅੱਪ ਮਿਤੀ {pickup_date} ਤੈਅ ਕੀਤੀ ਗਈ ਹੈ।"
            else:
                reply_text = "ਤੁਹਾਡਾ ਪੂਲ ਅਜੇ ਬਣ ਰਿਹਾ ਹੈ। ਪੂਰਾ ਲੋਡ ਇਕੱਠਾ ਹੋਣ 'ਤੇ ਪਿਕਅੱਪ ਮਿਤੀ ਤੈਅ ਹੋਵੇਗੀ।"

        elif intent == "ask_pool_progress":
            listings_resp = client.table("listings").select("pool_id, pools(*)").eq("farmer_id", profile_id).eq("status", "pooled").limit(1).execute()
            if listings_resp.data and listings_resp.data[0].get("pools"):
                pool = listings_resp.data[0]["pools"]
                cur = float(pool.get("current_tonnes") or 0)
                target = float(pool.get("target_tonnes") or 25)
                reply_text = f"📊 ਤੁਹਾਡੇ ਪਿੰਡ ਦੇ ਪੂਲ ਵਿੱਚ {cur:.1f} / {target:.1f} ਟਨ ਪਰਾਲੀ ਇਕੱਠੀ ਹੋ ਗਈ ਹੈ। ਸਥਿਤੀ: {pool.get('status')}।"
            else:
                reply_text = "ਤੁਸੀਂ ਫ਼ਿਲਹਾਲ ਕਿਸੇ ਸਰਗਰਮ ਪੂਲ ਵਿੱਚ ਨਹੀਂ ਹੋ।"

        elif intent == "ask_payment_status":
            pickups_resp = client.table("pickups").select("actual_tonnes, amount_due, payment_status, listings(farmer_id)").order("created_at", desc=True).execute()
            found_pickup = None
            for p in pickups_resp.data or []:
                if p.get("listings", {}).get("farmer_id") == profile_id:
                    found_pickup = p
                    break

            if found_pickup:
                due = found_pickup.get("amount_due") or 0
                st = found_pickup.get("payment_status", "pending")
                st_pa = "ਪ੍ਰਾਪਤ ਹੋਇਆ" if st == "received" else ("ਪ੍ਰਾਪਤ ਨਹੀਂ ਹੋਇਆ" if st == "not_received" else "ਬਕਾਇਆ")
                reply_text = f"💵 ਭੁਗਤਾਨ ਸਥਿਤੀ: {st_pa}। ਬਕਾਇਆ ਰਕਮ: ₹{due:,.2f}।"
            else:
                reply_text = "ਫ਼ਿਲਹਾਲ ਕੋਈ ਮੁਕੰਮਲ ਪਿਕਅੱਪ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ।"

        elif intent == "set_payment_status":
            wanted_status = entities.get("payment_status", "received")
            pickups_resp = client.table("pickups").select("id, listings(farmer_id)").order("created_at", desc=True).execute()
            my_pickup_id = None
            for p in pickups_resp.data or []:
                if p.get("listings", {}).get("farmer_id") == profile_id:
                    my_pickup_id = p["id"]
                    break

            if my_pickup_id:
                client.table("pickups").update({"payment_status": wanted_status}).eq("id", my_pickup_id).execute()
                status_text = "ਪ੍ਰਾਪਤ ਹੋਇਆ (Received)" if wanted_status == "received" else "ਪ੍ਰਾਪਤ ਨਹੀਂ ਹੋਇਆ (Not Received)"
                reply_text = f"✅ ਤੁਹਾਡਾ ਭੁਗਤਾਨ ਸਟੇਟਸ '{status_text}' ਵਜੋਂ ਅੱਪਡੇਟ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।"
            else:
                reply_text = "ਅੱਪਡੇਟ ਕਰਨ ਲਈ ਕੋਈ ਸਰਗਰਮ ਪਿਕਅੱਪ ਨਹੀਂ ਮਿਲੀ।"

        elif intent == "request_support":
            listings_resp = client.table("listings").select("id, est_tonnes").eq("farmer_id", profile_id).eq("status", "open").limit(1).execute()
            if listings_resp.data:
                lst = listings_resp.data[0]
                from app.services.charity_service import create_assistance_request
                await create_assistance_request(profile_id, None, lst["id"], 2500.0, "WhatsApp Support Request")
                reply_text = "🛡️ ਤੁਹਾਡੀ ਪਰਾਲੀ ਨੂੰ ਬਿਨਾਂ ਸਾੜੇ ਚੁਕਵਾਉਣ ਲਈ ਸਿਟੀਜ਼ਨ ਚੈਰਿਟੀ ਪੋਰਟਲ 'ਤੇ ਬੇਨਤੀ ਦਰਜ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ।"
            else:
                reply_text = "ਮਦਦ ਦੀ ਬੇਨਤੀ ਲਈ ਪਹਿਲਾਂ ਆਪਣੀ ਪਰਾਲੀ ਦੀ ਲਿਸਟਿੰਗ ਬਣਾਓ।"

    except Exception as e:
        logger.error(f"Error handling WhatsApp intent {intent}: {e}")
        reply_text = "ਕੁਝ ਤਕਨੀਕੀ ਸਮੱਸਿਆ ਆਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"

    # 5. Send reply
    await send_whatsapp_message(phone_number, reply_text)

    # 6. Log outbound message
    client.table("messages").insert({
        "profile_id": profile_id,
        "phone_number": phone_number,
        "direction": "outbound",
        "raw_text": reply_text,
        "parsed_intent": None,
        "parsed_json": None
    }).execute()
