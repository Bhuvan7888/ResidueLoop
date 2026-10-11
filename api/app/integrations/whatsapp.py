import hashlib
import hmac
import logging
import re
import uuid
from dataclasses import dataclass
from typing import Any

from app.core.config import get_settings
from app.integrations.http import SharedHttpClient

logger = logging.getLogger(__name__)

GRAPH_URL = "https://graph.facebook.com/{version}/{phone_number_id}/messages"
_INDIAN_E164 = re.compile(r"^\+91\d{10}$")


@dataclass(frozen=True)
class IncomingMessage:
    id: str
    phone: str
    text: str


def verify_signature(raw_body: bytes, signature_header: str, app_secret: str) -> bool:
    """Meta signs the exact bytes it sends with the app secret. Fails closed when anything is missing."""
    if not app_secret or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(app_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header.removeprefix("sha256="))


def verify_token_matches(mode: str, token: str, expected: str) -> bool:
    """The handshake Meta runs when the webhook is registered."""
    return mode == "subscribe" and bool(expected) and hmac.compare_digest(token, expected)


def phone_from_wa_id(wa_id: str) -> str | None:
    """Meta sends numbers without the plus sign. Anything that is not an Indian number is rejected."""
    phone = f"+{wa_id.strip()}"
    return phone if _INDIAN_E164.match(phone) else None


def mask_phone(phone: str) -> str:
    return f"{phone[:3]}******{phone[-4:]}"


def text_messages(payload: dict[str, Any]) -> list[IncomingMessage]:
    """The text messages in one webhook call. Status updates, media and malformed entries are skipped."""
    found: list[IncomingMessage] = []
    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            for message in (change.get("value") or {}).get("messages") or []:
                phone = phone_from_wa_id(str(message.get("from", "")))
                body = (message.get("text") or {}).get("body")
                if message.get("type") == "text" and message.get("id") and phone and isinstance(body, str):
                    found.append(IncomingMessage(id=str(message["id"]), phone=phone, text=body))
    return found


async def send_text(to_phone: str, body: str) -> str:
    """Send one WhatsApp text and return its provider message id. Free-form text works inside the 24-hour window."""
    settings = get_settings()
    if settings.mock_whatsapp_send:
        # MOCK: nothing leaves the server. The reply is stored and logged with a masked number.
        logger.info("MOCK whatsapp send to %s", mask_phone(to_phone))
        return f"mock-{uuid.uuid4()}"

    url = GRAPH_URL.format(version=settings.graph_api_version, phone_number_id=settings.whatsapp_phone_number_id)
    response = await SharedHttpClient.post(
        url,
        headers={"Authorization": f"Bearer {settings.whatsapp_access_token}"},
        json={"messaging_product": "whatsapp", "recipient_type": "individual", "to": to_phone, "type": "text", "text": {"body": body}},
    )
    response.raise_for_status()
    return str(response.json()["messages"][0]["id"])
