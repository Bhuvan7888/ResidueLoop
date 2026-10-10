import logging
from app.core.config import get_settings
from app.core.security import get_supabase_client
from app.integrations.llm import parse_message_intent

logger = logging.getLogger(__name__)

async def send_whatsapp_message(to_number: str, text: str) -> None:
    """
    Sends a WhatsApp message using Twilio's API.
    """
    settings = get_settings()
    if not settings.twilio_auth_token:
        logger.warning(f"Mock WhatsApp Send to {to_number}: {text}")
        return

    logger.info(f"Twilio WhatsApp Send to {to_number}: {text}")

async def process_inbound_message(phone_number: str, message_text: str) -> None:
    """
    Processes an incoming WhatsApp message.
    """
    client = get_supabase_client()

    # 1. Look up profile
    # The phone number comes as e.g. '+919999999999'. Profiles table requires this format.
    profile_response = client.table("profiles").select("id, role").eq("phone", phone_number).execute()
    
    if not profile_response.data or len(profile_response.data) == 0:
        await send_whatsapp_message(phone_number, "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਸਾਡੀ ਵੈੱਬਸਾਈਟ 'ਤੇ ਆਪਣਾ ਖਾਤਾ ਬਣਾਓ। (Hello! Please create your account on our website first.)")
        return

    profile_id = profile_response.data[0]["id"]
    role = profile_response.data[0]["role"]

    if role != "farmer":
        await send_whatsapp_message(phone_number, "Sorry, this WhatsApp service is currently only for farmers.")
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
    reply_text = "ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਦੱਸੋ। (I didn't understand. Please tell me again.)"

    try:
        if intent == "create_listing":
            acres = entities.get("acres")
            harvest_date = entities.get("harvest_date")
            
            if not acres or not harvest_date:
                reply_text = "ਕਿਰਪਾ ਕਰਕੇ ਏਕੜ ਅਤੇ ਵਾਢੀ ਦੀ ਮਿਤੀ ਦੱਸੋ। (Please provide acres and harvest date.)"
            else:
                # Find a plot for this farmer, or create a mock one. For the hackathon demo, we will find the first plot.
                plots_resp = client.table("plots").select("id").eq("farmer_id", profile_id).execute()
                if not plots_resp.data:
                    reply_text = "ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਐਪ ਵਿੱਚ ਇੱਕ ਖੇਤ (plot) ਬਣਾਓ। (Please create a plot in the app first.)"
                else:
                    plot_id = plots_resp.data[0]["id"]
                    
                    # Create listing
                    est_tonnes = float(acres) * 2.5 # Assuming 2.5 tonnes per acre
                    client.table("listings").insert({
                        "farmer_id": profile_id,
                        "plot_id": plot_id,
                        "est_tonnes": est_tonnes,
                        "harvest_date": harvest_date,
                        "combine_sms_used": False,
                        "status": "open",
                        "source": "whatsapp"
                    }).execute()
                    
                    reply_text = f"ਤੁਹਾਡੀ {acres} ਏਕੜ ਦੀ ਲਿਸਟਿੰਗ ਬਣਾ ਦਿੱਤੀ ਗਈ ਹੈ। (Your {acres}-acre listing has been created.)"

        elif intent == "ask_pickup_date":
            # Find the most recent matched pool for this farmer
            pickups_resp = client.table("pickups").select("pools(pickup_date)").eq("farmer_id", profile_id).order("created_at", desc=True).limit(1).execute()
            if pickups_resp.data and pickups_resp.data[0].get("pools") and pickups_resp.data[0]["pools"].get("pickup_date"):
                date = pickups_resp.data[0]["pools"]["pickup_date"]
                reply_text = f"ਤੁਹਾਡੀ ਅਗਲੀ ਪਿਕਅੱਪ ਮਿਤੀ {date} ਹੈ। (Your next pickup date is {date}.)"
            else:
                reply_text = "ਤੁਹਾਡੀ ਕੋਈ ਪਿਕਅੱਪ ਤੈਅ ਨਹੀਂ ਹੋਈ ਹੈ। (You have no scheduled pickups.)"

        # (Other intents can be filled in similarly based on demo needs)
        
    except Exception as e:
        logger.error(f"Error handling intent {intent}: {e}")
        reply_text = "ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ ਹੈ। (Something went wrong.)"

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
