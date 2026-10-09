from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request, Response

from app.core.config import get_settings
from app.integrations import whatsapp
from app.services import conversation_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

_EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response/>'


def _signed_url(request: Request) -> str:
    base = get_settings().public_base_url.rstrip("/")
    return f"{base}{request.url.path}" if base else str(request.url)


@router.post("/whatsapp")
async def whatsapp_webhook(
    request: Request, background: BackgroundTasks, x_twilio_signature: str = Header(default="")
) -> Response:
    # Twilio posts form fields, so this route is the one exception to "JSON only". The signature is checked first.
    form = await request.form()
    params = {key: str(value) for key, value in form.items()}
    if not whatsapp.verify_signature(
        _signed_url(request), params, x_twilio_signature, get_settings().twilio_auth_token
    ):
        raise HTTPException(status_code=403, detail="Invalid signature")

    phone = whatsapp.phone_from_sender(params.get("From", ""))
    message_sid = params.get("MessageSid", "")
    if phone is not None and message_sid:
        background.add_task(conversation_service.handle_inbound, message_sid, phone, params.get("Body", ""))
    return Response(content=_EMPTY_TWIML, media_type="text/xml")
