import base64
import hashlib
import hmac
import logging
import re
import uuid

from pydantic import BaseModel, ConfigDict

from app.core.config import get_settings
from app.integrations.http import SharedHttpClient

logger = logging.getLogger(__name__)

_INDIAN_E164 = re.compile(r"^\+91\d{10}$")


class TwilioMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sid: str


def compute_signature(url: str, params: dict[str, str], auth_token: str) -> str:
    """Twilio signs the full URL plus every form field, sorted by name."""
    payload = url + "".join(f"{key}{params[key]}" for key in sorted(params))
    digest = hmac.new(auth_token.encode(), payload.encode(), hashlib.sha1).digest()
    return base64.b64encode(digest).decode()


def verify_signature(url: str, params: dict[str, str], signature: str, auth_token: str) -> bool:
    """Constant-time check. A missing token or signature always fails, so an unconfigured server accepts nothing."""
    if not auth_token or not signature:
        return False
    return hmac.compare_digest(compute_signature(url, params, auth_token), signature)


def phone_from_sender(sender: str) -> str | None:
    """`whatsapp:+919876543210` becomes `+919876543210`. Anything that is not an Indian number is rejected."""
    phone = sender.removeprefix("whatsapp:").strip()
    return phone if _INDIAN_E164.match(phone) else None


def mask_phone(phone: str) -> str:
    return f"{phone[:3]}******{phone[-4:]}"


async def send_message(to_phone: str, body: str) -> str:
    """Send one WhatsApp message and return the provider message id."""
    settings = get_settings()
    if settings.mock_whatsapp_send:
        # MOCK: nothing leaves the server. The reply is stored and logged with a masked number.
        logger.info("MOCK whatsapp send to %s", mask_phone(to_phone))
        return f"mock-{uuid.uuid4()}"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    response = await SharedHttpClient.post(
        url,
        auth=(settings.twilio_account_sid, settings.twilio_auth_token),
        data={"From": settings.twilio_whatsapp_from, "To": f"whatsapp:{to_phone}", "Body": body},
    )
    response.raise_for_status()
    return TwilioMessage.model_validate(response.json()).sid
