import json
import logging

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query, Request, Response
from fastapi.responses import PlainTextResponse

from app.core.config import get_settings
from app.integrations import whatsapp
from app.services import conversation_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


@router.get("/whatsapp")
def verify_webhook(
    mode: str = Query("", alias="hub.mode"),
    token: str = Query("", alias="hub.verify_token"),
    challenge: str = Query("", alias="hub.challenge"),
) -> PlainTextResponse:
    """Meta calls this once when the webhook is registered in the app dashboard."""
    if not whatsapp.verify_token_matches(mode, token, get_settings().whatsapp_verify_token):
        raise HTTPException(status_code=403, detail="Verification failed")
    return PlainTextResponse(challenge)


@router.post("/whatsapp")
async def whatsapp_webhook(
    request: Request, background: BackgroundTasks, x_hub_signature_256: str = Header(default="")
) -> Response:
    # The signature covers the exact bytes received, so it is checked before anything is parsed.
    raw_body = await request.body()
    if not whatsapp.verify_signature(raw_body, x_hub_signature_256, get_settings().meta_app_secret):
        raise HTTPException(status_code=403, detail="Invalid signature")
    try:
        payload = json.loads(raw_body)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON") from None

    parsed = payload if isinstance(payload, dict) else {}
    for failure in whatsapp.failed_statuses(parsed):
        logger.warning("whatsapp delivery failed: %s", failure)

    # Answer Meta at once and do the model call and the reply in the background, as Meta retries slow webhooks.
    for message in whatsapp.text_messages(parsed):
        background.add_task(conversation_service.handle_inbound, message.id, message.phone, message.text)
    return Response(status_code=200)
