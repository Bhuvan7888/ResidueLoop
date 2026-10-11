import json
import logging
import re
import datetime
import httpx
from typing import Any, Dict, cast
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# LLM parser with a strict JSON schema for intents:
# create_listing, accept_offer, ask_pickup_date, ask_pool_progress, ask_payment_status, set_payment_status, request_support.

SYSTEM_PROMPT = """You are the ResidueLoop WhatsApp assistant parsing farmer messages in Punjabi or English.
You must output ONLY valid JSON matching the following schema. Do not include markdown formatting or extra text.

{
  "intent": "create_listing" | "accept_offer" | "ask_pickup_date" | "ask_pool_progress" | "ask_payment_status" | "set_payment_status" | "request_support" | "unknown",
  "entities": {
    "acres": number (optional, for create_listing),
    "harvest_date": "YYYY-MM-DD" (optional, for create_listing),
    "offer_id": string (optional, for accept_offer),
    "payment_status": "received" | "not_received" (optional)
  }
}
"""

def _rule_based_fallback(text: str) -> Dict[str, Any]:
    lower = text.lower()
    
    # 1. Ask pickup date
    if any(k in lower for k in ["pickup", "ਪਿਕਅੱਪ", "date", "ਮਿਤੀ", "ਕਦੋਂ", "when"]):
        return {"intent": "ask_pickup_date", "entities": {}}

    # 2. Ask pool progress
    if any(k in lower for k in ["pool", "ਪੂਲ", "progress", "ਭਰਿਆ", "ਕਿੰਨਾ", "status of pool"]):
        return {"intent": "ask_pool_progress", "entities": {}}

    # 3. Set or ask payment status
    if any(k in lower for k in ["payment", "ਭੁਗਤਾਨ", "ਪੈਸੇ", "money", "due"]):
        if any(k in lower for k in ["ਮਿਲ ਗਏ", "received", "got", "received payment", "ਮਿਲ ਗਏ ਹਨ"]):
            return {"intent": "set_payment_status", "entities": {"payment_status": "received"}}
        if any(k in lower for k in ["ਨਹੀਂ ਮਿਲੇ", "not received", "didn't get", "not yet", "ਬਕਾਇਆ"]):
            return {"intent": "set_payment_status", "entities": {"payment_status": "not_received"}}
        return {"intent": "ask_payment_status", "entities": {}}

    # 4. Accept offer
    if any(k in lower for k in ["accept", "ਮਨਜ਼ੂਰ", "ਸਵੀਕਾਰ", "agree", "yes offer", "offer accept"]):
        return {"intent": "accept_offer", "entities": {}}

    # 5. Request support / charity
    if any(k in lower for k in ["support", "help", "ਮਦਦ", "ਸਹਾਇਤਾ", "charity", "ngo", "crowdfund", "funds"]):
        return {"intent": "request_support", "entities": {}}

    # 6. Create listing: e.g. "5 acres", "10 ਏਕੜ", "harvest on 2026-10-25"
    acre_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:acres?|ਏਕੜ|killa|ਕਿੱਲੇ)", lower)
    if acre_match or any(k in lower for k in ["list", "listing", "ਸੂਚੀ", "ਪਰਾਲੀ ਵੇਚਣੀ", "stubble"]):
        acres = float(acre_match.group(1)) if acre_match else 5.0
        date_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
        h_date = date_match.group(1) if date_match else (datetime.date.today() + datetime.timedelta(days=7)).isoformat()
        return {"intent": "create_listing", "entities": {"acres": acres, "harvest_date": h_date}}

    return {"intent": "unknown", "entities": {}}

async def parse_message_intent(message_text: str) -> Dict[str, Any]:
    """
    Parses the message intent using Gemini LLM with robust rule-based fallback.
    """
    settings = get_settings()
    if not settings.llm_api_key or settings.llm_api_key == "mock":
        return _rule_based_fallback(message_text)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.llm_api_key}"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": SYSTEM_PROMPT + "\n\nMessage to parse: " + message_text}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=6.0)
            response.raise_for_status()
            data = response.json()
            text_content = data["candidates"][0]["content"]["parts"][0]["text"]
            res = json.loads(text_content)
            if res.get("intent") and res.get("intent") != "unknown":
                return cast(dict[str, Any], res)
            return _rule_based_fallback(message_text)
        except Exception as e:
            logger.info(f"Using rule-based parser fallback: {e}")
            return _rule_based_fallback(message_text)
