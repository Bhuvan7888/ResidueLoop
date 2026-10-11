import logging
import datetime
import re
import uuid
import json
import httpx
from typing import Any, Dict
from app.core.config import get_settings
from app.core.security import get_supabase_client
from app.integrations.llm import parse_message_intent

logger = logging.getLogger(__name__)

# Active questionnaire sessions indexed by phone number
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}


async def send_whatsapp_message(to_number: str, text: str, profile_id: str | None = None) -> None:
    """
    Sends a WhatsApp message using Meta's WhatsApp Cloud API (Graph API)
    or records local mock send, and persists to DB for timeline synchronization.
    """
    settings = get_settings()
    clean_phone = to_number.strip()
    if not clean_phone.startswith("+"):
        clean_phone = f"+{clean_phone}"

    # 1. Send via Meta WhatsApp Cloud API if credentials configured
    if settings.whatsapp_access_token and settings.whatsapp_phone_number_id:
        url = f"https://graph.facebook.com/{settings.graph_api_version}/{settings.whatsapp_phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {settings.whatsapp_access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {"body": text},
        }
        try:
            async with httpx.AsyncClient() as http_client:
                res = await http_client.post(url, headers=headers, json=payload, timeout=8.0)
                if res.is_success:
                    logger.info(f"Meta WhatsApp Cloud API message sent to {clean_phone}: {res.json()}")
                else:
                    logger.warning(f"Meta WhatsApp Cloud API send notice to {clean_phone} ({res.status_code}): {res.text}")
        except Exception as e:
            logger.error(f"Error calling Meta WhatsApp API for {clean_phone}: {e}")
    else:
        logger.info(f"Mock WhatsApp Send to {clean_phone}: {text}")

    # 2. Persist outbound message in database for Web UI simulator & activity timeline
    try:
        client = get_supabase_client()
        client.table("messages").insert({
            "profile_id": profile_id,
            "phone_number": clean_phone,
            "direction": "outbound",
            "raw_text": text,
            "parsed_intent": None,
            "parsed_json": None,
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to record outbound message in DB: {e}")


async def process_inbound_message(phone_number: str, message_text: str) -> None:
    """
    Processes an incoming WhatsApp message with zero-barrier onboarding,
    multi-turn questionnaire for stubble quality & purpose, and automated buyer matching.
    """
    client = get_supabase_client()
    clean_phone = phone_number.strip()
    if not clean_phone.startswith("+"):
        clean_phone = f"+{clean_phone}"

    text_stripped = message_text.strip()
    text_lower = text_stripped.lower()

    # 1. Look up profile or auto-onboard farmer (no web app barrier)
    profile_response = client.table("profiles").select("id, role, name").eq("phone", clean_phone).execute()
    
    if not profile_response.data or len(profile_response.data) == 0:
        short_num = clean_phone[-4:] if len(clean_phone) >= 4 else clean_phone
        user_id = None
        try:
            auth_user = client.auth.admin.create_user({
                "phone": clean_phone,
                "phone_confirm": True,
                "user_metadata": {"role": "farmer"},
            })
            if auth_user and auth_user.user:
                user_id = auth_user.user.id
        except Exception as e:
            logger.info(f"Auth user creation notice (might already exist): {e}")

        if not user_id:
            try:
                users = client.auth.admin.list_users()
                clean_num = re.sub(r"\D", "", clean_phone)
                matched = [u for u in users if re.sub(r"\D", "", getattr(u, "phone", "") or "") == clean_num]
                if matched:
                    user_id = matched[0].id
            except Exception as e:
                logger.warning(f"Could not list users from auth: {e}")

        if user_id:
            try:
                client.table("profiles").upsert({
                    "id": user_id,
                    "phone": clean_phone,
                    "role": "farmer",
                    "name": f"ਕਿਸਾਨ (Farmer {short_num})",
                }).execute()
                v_res = client.table("villages").select("id").limit(1).execute()
                v_id = v_res.data[0]["id"] if v_res.data else "11111111-1111-1111-1111-111111111111"
                try:
                    client.table("farmers").upsert({"profile_id": user_id, "village_id": v_id}).execute()
                except Exception as fe:
                    logger.warning(f"Could not upsert farmers record: {fe}")
                # Provision default 5 acre plot in Punjab
                p_check = client.table("plots").select("id").eq("farmer_id", user_id).execute()
                if not p_check.data:
                    client.table("plots").insert({
                        "farmer_id": user_id,
                        "village_id": v_id,
                        "acres": 5.0,
                        "centre": {"type": "Point", "coordinates": [75.2, 30.8]},
                    }).execute()
                profile_id = user_id
            except Exception as e:
                logger.error(f"Failed to upsert profile for {clean_phone}: {e}")
                profile_id = user_id
        else:
            # Fallback to first existing farmer in db if auth creation failed
            existing_f = client.table("profiles").select("id").eq("role", "farmer").limit(1).execute()
            profile_id = existing_f.data[0]["id"] if existing_f.data else None
    else:
        profile_id = profile_response.data[0]["id"]

    # 2. Record inbound message
    try:
        client.table("messages").insert({
            "profile_id": profile_id,
            "phone_number": clean_phone,
            "direction": "inbound",
            "raw_text": text_stripped,
            "parsed_intent": "inbound",
            "parsed_json": {"text": text_stripped},
        }).execute()
    except Exception as e:
        logger.warning(f"Could not persist inbound message: {e}")

    # 3. Check for active questionnaire session
    session = ACTIVE_SESSIONS.get(clean_phone)

    # Greeting / Restart check
    is_greeting = any(k in text_lower for k in [
        "hi", "hello", "start", "list", "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ",
        "ਨਮਸਕਾਰ", "ਸੁਆਗਤ", "ਪਰਾਲੀ", "ਨਵੀਂ ਲਿਸਟਿੰਗ", "ਸੁਨੇਹਾ"
    ])

    reply_text = ""

    if is_greeting and not session:
        # Start new questionnaire
        ACTIVE_SESSIONS[clean_phone] = {
            "step": "ask_acres",
            "updated_at": datetime.datetime.now(),
        }
        reply_text = (
            "🌾 ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ResidueLoop ਪਰਾਲੀ ਸੇਵਾ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ।\n"
            "ਅਸੀਂ ਤੁਹਾਡੀ ਪਰਾਲੀ ਨੂੰ ਬਿਨਾਂ ਸਾੜੇ, ਚੰਗੇ ਮੁੱਲ 'ਤੇ ਨੇੜਲੇ ਖਰੀਦਦਾਰਾਂ ਨੂੰ ਵੇਚਣ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗੇ।\n\n"
            "📍 ਸਵਾਲ 1/5: ਤੁਹਾਡੇ ਕੋਲ ਕਿੰਨੇ ਏਕੜ ਜ਼ਮੀਨ ਦੀ ਪਰਾਲੀ ਹੈ?\n"
            "(ਕਿਰਪਾ ਕਰਕੇ ਸਿਰਫ਼ ਨੰਬਰ ਲਿਖੋ, ਜਿਵੇਂ: 5 ਜਾਂ 10)"
        )
        await send_whatsapp_message(clean_phone, reply_text, profile_id)
        return

    # If in active questionnaire session
    if session:
        step = session.get("step")

        if step == "ask_acres":
            num_match = re.search(r"(\d+(?:\.\d+)?)", text_stripped)
            if num_match:
                acres = float(num_match.group(1))
                if acres <= 0:
                    acres = 5.0
                est_tonnes = acres * 2.5
                session["acres"] = acres
                session["est_tonnes"] = est_tonnes
                session["step"] = "ask_harvest_date"
                reply_text = (
                    f"ਬਹੁਤ ਵਧੀਆ! {acres} ਏਕੜ ਰਕਬਾ (~{est_tonnes:.1f} ਟਨ ਪਰਾਲੀ)।\n\n"
                    "🗓️ ਸਵਾਲ 2/5: ਕਟਾਈ ਕਦੋਂ ਤੱਕ ਹੋਣ ਦੀ ਉਮੀਦ ਹੈ?\n"
                    "1️⃣ ਅਗਲੇ 2-3 ਦਿਨਾਂ ਵਿੱਚ\n"
                    "2️⃣ 1 ਹਫ਼ਤੇ ਬਾਅਦ\n"
                    "3️⃣ 2 ਹਫ਼ਤਿਆਂ ਬਾਅਦ\n"
                    "(1, 2, ਜਾਂ 3 ਲਿਖ ਕੇ ਜਵਾਬ ਦਿਓ)"
                )
            else:
                reply_text = "ਕਿਰਪਾ ਕਰਕੇ ਸਿਰਫ਼ ਏਕੜਾਂ ਦੀ ਗਿਣਤੀ ਲਿਖੋ (ਜਿਵੇਂ: 5 ਜਾਂ 10)।"

            await send_whatsapp_message(clean_phone, reply_text, profile_id)
            return

        elif step == "ask_harvest_date":
            today = datetime.date.today()
            if "1" in text_stripped:
                h_date = today + datetime.timedelta(days=3)
            elif "3" in text_stripped:
                h_date = today + datetime.timedelta(days=14)
            else:
                h_date = today + datetime.timedelta(days=7)
            session["harvest_date"] = h_date.isoformat()
            session["step"] = "ask_quality"

            reply_text = (
                "🌾 ਸਵਾਲ 3/5: ਤੁਹਾਡੀ ਪਰਾਲੀ ਦੀ ਕੁਆਲਿਟੀ ਕਿਹੋ ਜਿਹੀ ਹੈ?\n"
                "1️⃣ ਗ੍ਰੇਡ A+ (ਸੁੱਕੀ, ਸੁਨਹਿਰੀ ਤੇ ਸਾਫ਼ - ਪਸ਼ੂ ਚਾਰੇ ਲਈ, ਸਭ ਤੋਂ ਵੱਧ ਰੇਟ)\n"
                "2️⃣ ਗ੍ਰੇਡ A (ਕੰਬਾਈਨ SMS ਵਾਲੀ ਬਾਰੀਕ ਕੱਟੀ - ਪੇਪਰ ਮਿੱਲ/ਪੈਲੇਟ ਲਈ)\n"
                "3️⃣ ਗ੍ਰੇਡ B (ਆਮ ਖੇਤ ਵਾਲੀ ਖੁੱਲ੍ਹੀ ਪਰਾਲੀ - ਬਾਇਓਮਾਸ ਪਲਾਂਟ ਲਈ)\n"
                "(1, 2, ਜਾਂ 3 ਲਿਖ ਕੇ ਜਵਾਬ ਦਿਓ)"
            )
            await send_whatsapp_message(clean_phone, reply_text, profile_id)
            return

        elif step == "ask_quality":
            if "1" in text_stripped:
                session["quality_grade"] = "grade_a_plus"
                session["combine_sms_used"] = True
                session["quality_label"] = "ਗ੍ਰੇਡ A+ ਸੁਨਹਿਰੀ (ਪਸ਼ੂ ਚਾਰਾ)"
            elif "2" in text_stripped:
                session["quality_grade"] = "grade_a_sms"
                session["combine_sms_used"] = True
                session["quality_label"] = "ਗ੍ਰੇਡ A (ਕੰਬਾਈਨ SMS ਕੱਟੀ)"
            else:
                session["quality_grade"] = "grade_b"
                session["combine_sms_used"] = False
                session["quality_label"] = "ਗ੍ਰੇਡ B (ਆਮ ਖੇਤ ਪਰਾਲੀ)"

            session["step"] = "ask_purpose"
            reply_text = (
                "🎯 ਸਵਾਲ 4/5: ਇਹ ਕਿਸ ਕੰਮ ਲਈ ਸਭ ਤੋਂ ਢੁੱਕਵੀਂ ਹੈ?\n"
                "1️⃣ ਪਸ਼ੂਆਂ ਦਾ ਚਾਰਾ / ਡੇਅਰੀ (Cattle Feed - ₹4,800–₹8,500/ਟਨ)\n"
                "2️⃣ ਬਿਜਲੀ ਘਰ / NTPC ਪਲਾਂਟ (Power Plants - ₹4,320–₹5,500/ਟਨ)\n"
                "3️⃣ ਪੇਪਰ ਮਿੱਲ ਤੇ ਗੱਤਾ ਫੈਕਟਰੀ (Paper Mills - ₹1,330–₹3,000/ਟਨ)\n"
                "4️⃣ ਇੱਟਾਂ ਦੇ ਭੱਠੇ ਤੇ ਭੱਠੀਆਂ (Brick Kilns - ₹600–₹1,400/ਟਨ)\n"
                "5️⃣ ਸਾਰੇ ਖਰੀਦਦਾਰਾਂ ਲਈ ਖੁੱਲ੍ਹਾ (All Biomass Buyers)\n"
                "(1 ਤੋਂ 5 ਵਿੱਚੋਂ ਨੰਬਰ ਚੁਣੋ)"
            )
            await send_whatsapp_message(clean_phone, reply_text, profile_id)
            return

        elif step == "ask_purpose":
            if "1" in text_stripped:
                purposes = ["cattle_feed"]
            elif "2" in text_stripped:
                purposes = ["thermal_power"]
            elif "3" in text_stripped:
                purposes = ["paper_packaging"]
            elif "4" in text_stripped:
                purposes = ["brick_kiln"]
            else:
                purposes = ["biomass_plant"]
            session["intended_purposes"] = purposes
            session["step"] = "ask_form"

            reply_text = (
                "📦 ਸਵਾਲ 5/5: ਪਰਾਲੀ ਕਿਸ ਰੂਪ ਵਿੱਚ ਦੇਣਾ ਚਾਹੁੰਦੇ ਹੋ?\n"
                "1️⃣ ਖੇਤ ਵਿੱਚੋਂ ਖੁੱਲ੍ਹੀ (Direct Farm-Gate Pickup - ₹500–₹700/ਟਨ)\n"
                "2️⃣ ਗੱਠਾਂ ਬਣਵਾ ਕੇ (Delivered Bales - ₹1,330–₹3,000/ਟਨ)\n"
                "(1 ਜਾਂ 2 ਲਿਖ ਕੇ ਜਵਾਬ ਦਿਓ)"
            )
            await send_whatsapp_message(clean_phone, reply_text, profile_id)
            return

        elif step == "ask_form":
            purposes = session.get("intended_purposes", ["biomass_plant"])
            quality = session.get("quality_grade", "grade_b")
            combine_sms = session.get("combine_sms_used", False)
            acres = session.get("acres", 5.0)
            est_tonnes = session.get("est_tonnes", acres * 2.5)

            if "2" in text_stripped:
                stubble_form = "delivered_bales"
                form_name = "ਗੱਠਾਂ (Delivered Bales)"
                benchmark = 1850.0
            else:
                stubble_form = "farm_gate_loose"
                form_name = "ਖੇਤ ਵਿੱਚੋਂ ਖੁੱਲ੍ਹੀ (Direct Farm-Gate Loose)"
                benchmark = 600.0

            if "cattle_feed" in purposes or quality == "grade_a_plus":
                benchmark = 6200.0
                form_name = "ਪਸ਼ੂ ਚਾਰਾ ਗੱਠਾਂ (Feed Grade Bales)"
                stubble_form = "commercial_feed_grade"
            elif "thermal_power" in purposes:
                benchmark = 4800.0
                form_name = "ਪ੍ਰੋਸੈਸਡ ਪੈਲੇਟਸ / ਬ੍ਰਿਕੇਟਸ (NTPC Pellets)"
                stubble_form = "processed_pellets"
            elif "brick_kiln" in purposes:
                benchmark = 1000.0
                form_name = "ਭੱਠਾ ਗ੍ਰੇਡ ਪਰਾਲੀ (Brick Kiln Grade)"
                stubble_form = "brick_kiln"

            total_payout = est_tonnes * benchmark

            # Find or auto-provision plot
            plots_resp = client.table("plots").select("id").eq("farmer_id", profile_id).execute()
            if plots_resp.data and len(plots_resp.data) > 0:
                plot_id = plots_resp.data[0]["id"]
            else:
                v_res = client.table("villages").select("id").limit(1).execute()
                v_id = v_res.data[0]["id"] if v_res.data else "11111111-1111-1111-1111-111111111111"
                try:
                    client.table("farmers").upsert({"profile_id": profile_id, "village_id": v_id}).execute()
                except Exception as fe:
                    logger.warning(f"Could not upsert farmers record: {fe}")
                new_plot = client.table("plots").insert({
                    "farmer_id": profile_id,
                    "village_id": v_id,
                    "acres": acres,
                    "centre": {"type": "Point", "coordinates": [75.2, 30.8]},
                }).execute()
                plot_id = new_plot.data[0]["id"]

            # Insert into listings table with structured metadata
            meta_payload = json.dumps({
                "channel": "whatsapp",
                "quality_grade": quality,
                "stubble_form": stubble_form,
                "intended_purposes": purposes,
                "moisture_level": "12-15%" if combine_sms else "15-20%",
                "expected_price_per_tonne": benchmark,
            })

            listing_res = client.table("listings").insert({
                "farmer_id": profile_id,
                "plot_id": plot_id,
                "est_tonnes": est_tonnes,
                "harvest_date": session.get("harvest_date", datetime.date.today().isoformat()),
                "combine_sms_used": combine_sms,
                "status": "open",
                "source": meta_payload,
            }).execute()

            listing_id = listing_res.data[0]["id"]

            # Automatically run buyer matching algorithm
            from app.services.matching_service import match_listing
            await match_listing(profile_id, listing_id)

            # Clear session
            ACTIVE_SESSIONS.pop(clean_phone, None)

            reply_text = (
                "🎉 ਮੁਬਾਰਕਾਂ! ਤੁਹਾਡੀ ਪਰਾਲੀ ਦੀ ਲਿਸਟਿੰਗ ਦਰਜ ਹੋ ਗਈ ਹੈ:\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                f"📍 ਰਕਬਾ: {acres:.1f} ਏਕੜ (~{est_tonnes:.1f} ਟਨ)\n"
                f"🌾 ਕੁਆਲਿਟੀ: {session.get('quality_label', 'ਗ੍ਰੇਡ A')}\n"
                f"📦 ਰੂਪ: {form_name}\n"
                f"💰 ਸਰਕਾਰੀ/ਮਾਰਕੀਟ ਰੇਟ: ₹{benchmark:,.0f} / ਟਨ\n"
                f"💵 ਅੰਦਾਜ਼ਨ ਕੁੱਲ ਕਮਾਈ: ₹{total_payout:,.0f}\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                "✨ ਅਸੀਂ ਤੁਹਾਡੇ ਨੇੜਲੇ ਖਰੀਦਦਾਰਾਂ ਨਾਲ ਮੇਲ ਕਰ ਰਹੇ ਹਾਂ। ਜਿਵੇਂ ਹੀ ਖਰੀਦਦਾਰ ਪੇਸ਼ਕਸ਼ ਕਰੇਗਾ, ਤੁਹਾਨੂੰ ਇੱਥੇ ਤੁਰੰਤ ਸੁਨੇਹਾ ਮਿਲੇਗਾ!"
            )
            await send_whatsapp_message(clean_phone, reply_text, profile_id)
            return

    # 4. Standard Operational Intents (when not in questionnaire)
    parsed = await parse_message_intent(text_stripped)
    intent = parsed.get("intent", "unknown")
    entities = parsed.get("entities", {})

    # Quick Keyword Overrides
    if any(k in text_lower for k in ["accept", "ਹਾਂ", "ਮਨਜ਼ੂਰ", "agree", "yes", "ਸਵੀਕਾਰ"]):
        intent = "accept_offer"
    elif any(k in text_lower for k in ["ਮਿਲ ਗਏ", "received", "payment done"]):
        intent = "set_payment_status"
        entities["payment_status"] = "received"
    elif any(k in text_lower for k in ["ਨਹੀਂ ਮਿਲੇ", "not received"]):
        intent = "set_payment_status"
        entities["payment_status"] = "not_received"
    elif any(k in text_lower for k in ["pickup", "ਪਿਕਅੱਪ", "ਮਿਤੀ", "ਕਦੋਂ", "when pickup"]):
        intent = "ask_pickup_date"
    elif any(k in text_lower for k in ["pool", "ਪੂਲ", "progress"]):
        intent = "ask_pool_progress"
    elif any(k in text_lower for k in ["payment", "ਪੈਸੇ", "ਭੁਗਤਾਨ", "due"]):
        intent = "ask_payment_status"

    try:
        if intent == "accept_offer":
            offers_resp = client.table("offers").select("id, status, price_per_tonne, listings(farmer_id, est_tonnes)").eq("status", "pending").execute()
            farmer_offer = None
            for o in offers_resp.data or []:
                if o.get("listings", {}).get("farmer_id") == profile_id:
                    farmer_offer = o
                    break

            if farmer_offer:
                from app.services.matching_service import accept_offer
                await accept_offer(profile_id, farmer_offer["id"])
                price = farmer_offer.get("price_per_tonne", 1850)
                reply_text = (
                    "🎉 ਵਧਾਈਆਂ! ਤੁਸੀਂ ਪੇਸ਼ਕਸ਼ ਸਵੀਕਾਰ ਕਰ ਲਈ ਹੈ।\n"
                    f"ਸੌਦਾ ₹{price:,.0f}/ਟਨ 'ਤੇ ਪੱਕਾ ਹੋ ਗਿਆ ਹੈ ਅਤੇ ਤੁਹਾਡੀ ਪਰਾਲੀ ਪਿੰਡ ਦੇ ਪੂਲ ਵਿੱਚ ਸ਼ਾਮਲ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ।"
                )
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
                reply_text = f"🗓️ ਤੁਹਾਡੀ ਅਗਲੀ ਪਿਕਅੱਪ ਮਿਤੀ {pickup_date} ਤੈਅ ਕੀਤੀ ਗਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਟਰਾਲੀ ਤਿਆਰ ਰੱਖੋ।"
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
                st_pa = "ਪ੍ਰਾਪਤ ਹੋਇਆ (Received)" if st == "received" else ("ਪ੍ਰਾਪਤ ਨਹੀਂ ਹੋਇਆ (Pending)" if st == "not_received" else "ਬਕਾਇਆ (Processing)")
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

        else:
            reply_text = (
                "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਤੁਸੀਂ ਇਹ ਪੁੱਛ ਸਕਦੇ ਹੋ:\n"
                "1️⃣ 'Hi' ਜਾਂ 'ਪਰਾਲੀ' - ਨਵੀਂ ਪਰਾਲੀ ਲਿਸਟ ਕਰਨ ਲਈ\n"
                "2️⃣ 'ਪਿਕਅੱਪ ਮਿਤੀ' - ਆਪਣੀ ਪਿਕਅੱਪ ਮਿਤੀ ਪੁੱਛੋ\n"
                "3️⃣ 'ਪੂਲ' - ਪਿੰਡ ਦੇ ਪੂਲ ਦੀ ਪ੍ਰਗਤੀ ਦੇਖੋ\n"
                "4️⃣ 'ਪੈਸੇ' - ਭੁਗਤਾਨ ਦੀ ਸਥਿਤੀ ਜਾਣੋ\n"
                "5️⃣ 'ਹਾਂ' / 'Accept' - ਆਈ ਪੇਸ਼ਕਸ਼ ਸਵੀਕਾਰ ਕਰੋ\n"
                "6️⃣ 'ਮਿਲ ਗਏ' - ਪੈਸੇ ਮਿਲਣ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ"
            )

    except Exception as e:
        logger.error(f"Error handling WhatsApp message: {e}")
        reply_text = "ਕੁਝ ਤਕਨੀਕੀ ਸਮੱਸਿਆ ਆਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"

    await send_whatsapp_message(clean_phone, reply_text, profile_id)
