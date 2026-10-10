import json
import logging
import httpx
from typing import Any, Dict
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
    "offer_id": string (optional, for accept_offer)
  }
}
"""

async def parse_message_intent(message_text: str) -> Dict[str, Any]:
    """
    Parses the message intent using Gemini LLM.
    """
    settings = get_settings()
    if not settings.llm_api_key:
        logger.warning("LLM API key not set, using fallback parsing")
        # Fallback for testing without LLM
        return {"intent": "unknown", "entities": {}}

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
            response = await client.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            text_content = data["candidates"][0]["content"]["parts"][0]["text"]
            from typing import cast
            return cast(Dict[str, Any], json.loads(text_content))
        except Exception as e:
            logger.error(f"LLM parsing failed: {e}")
            return {"intent": "unknown", "entities": {}}
