from fastapi import APIRouter, Request, Header, HTTPException
from typing import Annotated
import logging
from app.services import whatsapp_service
from app.core.config import get_settings

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])
logger = logging.getLogger(__name__)

@router.post("/webhook")
async def twilio_webhook(
    request: Request,
    x_twilio_signature: Annotated[str | None, Header()] = None
) -> dict[str, str]:
    """
    Webhook for Twilio Sandbox WhatsApp messages.
    """
    form_data = await request.form()
    
    # In a real app, verify Twilio signature here.
    # For now, we will verify the webhook signature if required by the prompt rules.
    # "A forged webhook signature is rejected." -> Let's implement signature verification.
    settings = get_settings()
    if settings.twilio_auth_token and x_twilio_signature:
        import hmac
        import hashlib
        import base64
        url = str(request.url)
        # Twilio verification sorts params, appends to URL, and hashes.
        params = dict(form_data)
        sorted_keys = sorted(params.keys())
        for k in sorted_keys:
            url += f"{k}{params[k]}"
        mac = hmac.new(settings.twilio_auth_token.encode('utf-8'), url.encode('utf-8'), hashlib.sha1)
        expected_sig = base64.b64encode(mac.digest()).decode('utf-8')
        if not hmac.compare_digest(expected_sig, x_twilio_signature):
            # For the sake of the hackathon, we might not crash if we are testing locally without Ngrok.
            # But the spec says "A forged webhook signature is rejected."
            raise HTTPException(status_code=403, detail="Invalid Twilio signature")
    elif settings.twilio_auth_token and not x_twilio_signature:
        raise HTTPException(status_code=403, detail="Missing Twilio signature")

    from_field = form_data.get("From", "")
    body_field = form_data.get("Body", "")
    
    from_number = str(from_field) if from_field else ""
    body_text = str(body_field) if body_field else ""
    
    if not from_number or not body_text:
        return {"status": "ok", "message": "Ignored empty payload"}

    # Twilio numbers come as 'whatsapp:+91...'
    if from_number.startswith("whatsapp:"):
        from_number = from_number.replace("whatsapp:", "")
        
    await whatsapp_service.process_inbound_message(from_number, body_text)
    
    return {"status": "ok"}
