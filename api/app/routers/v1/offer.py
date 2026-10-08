from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import require_role
from app.services.matching_service import accept_offer, decline_offer

router = APIRouter(prefix="/offers", tags=["offers"])

class OfferAction(BaseModel):
    action: str # "accept" or "decline"

@router.post("/{offer_id}/action")
async def handle_offer_action(
    offer_id: str,
    payload: OfferAction,
    user_id: str = Depends(require_role(["farmer"]))
):
    if payload.action == "accept":
        await accept_offer(user_id, offer_id)
    elif payload.action == "decline":
        await decline_offer(user_id, offer_id)
    return {"data": "success"}
