from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.core.security import require_role
from app.services import matching_service

router = APIRouter(prefix="/offers", tags=["offers"])


class OfferAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: Literal["accept", "decline"]


@router.post("/{offer_id}/action")
def handle_offer_action(
    offer_id: str, payload: OfferAction, user_id: str = Depends(require_role(["farmer"]))
) -> dict[str, object]:
    if payload.action == "accept":
        return {"data": matching_service.accept_offer(user_id, offer_id)}
    matching_service.decline_offer(user_id, offer_id)
    return {"data": "declined"}
