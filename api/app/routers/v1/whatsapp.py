from fastapi import APIRouter, Request, Header, HTTPException, Query, Response
from fastapi.responses import PlainTextResponse
from typing import Annotated
from pydantic import BaseModel
import logging
import json
import hmac
import hashlib
from app.services import whatsapp_service
from app.core.config import get_settings

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])
logger = logging.getLogger(__name__)


@router.get("/webhook")
def verify_meta_webhook(
    hub_mode: str = Query("", alias="hub.mode"),
    hub_verify_token: str = Query("", alias="hub.verify_token"),
    hub_challenge: str = Query("", alias="hub.challenge"),
) -> PlainTextResponse:
    """
    Meta WhatsApp Cloud API Webhook verification handshake.
    Called once by Meta when the webhook URL is registered in Meta Developer Dashboard.
    """
    settings = get_settings()
    expected_token = settings.whatsapp_verify_token
    logger.info(f"Meta webhook verification request: mode={hub_mode}, token={hub_verify_token}")

    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        logger.info("Meta webhook verification succeeded")
        return PlainTextResponse(content=hub_challenge, status_code=200)

    logger.warning("Meta webhook verification failed: token mismatch")
    raise HTTPException(status_code=403, detail="Verification token mismatch")


@router.post("/webhook")
async def inbound_webhook(
    request: Request,
    x_hub_signature_256: Annotated[str | None, Header(alias="x-hub-signature-256")] = None,
    x_twilio_signature: Annotated[str | None, Header(alias="x-twilio-signature")] = None,
) -> Response:
    """
    Handles inbound messages from Meta WhatsApp Cloud API and Twilio Sandbox.
    """
    settings = get_settings()
    content_type = request.headers.get("content-type", "")

    # 1. Meta WhatsApp Cloud API (JSON Payload)
    if "application/json" in content_type:
        raw_body = await request.body()

        # Verify HMAC SHA256 signature if app secret provided
        if settings.meta_app_secret and x_hub_signature_256:
            expected_sig = "sha256=" + hmac.new(
                settings.meta_app_secret.encode("utf-8"), raw_body, hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(expected_sig, x_hub_signature_256):
                logger.warning("Meta signature verification failed")
                raise HTTPException(status_code=403, detail="Invalid Meta signature")

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

        # Parse messages from Meta webhook format
        entries = payload.get("entry") or []
        for entry in entries:
            changes = entry.get("changes") or []
            for change in changes:
                value = change.get("value") or {}
                messages = value.get("messages") or []
                for msg in messages:
                    if msg.get("type") == "text":
                        sender_phone = str(msg.get("from", ""))
                        if not sender_phone.startswith("+"):
                            sender_phone = f"+{sender_phone}"
                        body_text = msg.get("text", {}).get("body", "")
                        if sender_phone and body_text:
                            logger.info(f"Inbound Meta WhatsApp message from {sender_phone}: {body_text}")
                            await whatsapp_service.process_inbound_message(sender_phone, body_text)

        return Response(content="EVENT_RECEIVED", status_code=200)

    # 2. Twilio Form Data Fallback
    form_data = await request.form()
    from_field = form_data.get("From", "")
    body_field = form_data.get("Body", "")

    from_number = str(from_field) if from_field else ""
    body_text = str(body_field) if body_field else ""

    if from_number and body_text:
        if from_number.startswith("whatsapp:"):
            from_number = from_number.replace("whatsapp:", "")
        await whatsapp_service.process_inbound_message(from_number, body_text)

    return Response(content="OK", status_code=200)


class SimulateMessageRequest(BaseModel):
    phone: str
    message: str


@router.post("/simulate")
async def simulate_message(payload: SimulateMessageRequest) -> dict[str, str]:
    """
    Simulates sending an inbound WhatsApp message for in-app demo & offline testing.
    """
    await whatsapp_service.process_inbound_message(payload.phone, payload.message)
    return {"status": "ok"}
