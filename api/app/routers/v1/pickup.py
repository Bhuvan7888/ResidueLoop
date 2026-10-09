from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import PaymentStatus
from app.core.security import require_role
from app.services import pickup_service

router = APIRouter(prefix="/pickups", tags=["pickups"])


class WeightUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weighed_tonnes: float = Field(gt=0)
    quality_notes: str | None = Field(default=None, max_length=500)


class PaymentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    payment_status: PaymentStatus


@router.patch("/{pickup_id}/weight")
def update_weight(
    pickup_id: str, payload: WeightUpdate, user_id: str = Depends(require_role(["buyer"]))
) -> dict[str, object]:
    amount = pickup_service.record_weight(user_id, pickup_id, payload.weighed_tonnes, payload.quality_notes)
    return {"data": {"amount_due": amount}}


@router.post("/{pickup_id}/complete")
def complete(pickup_id: str, user_id: str = Depends(require_role(["buyer"]))) -> dict[str, str]:
    pickup_service.complete_pickup(user_id, pickup_id)
    return {"data": "success"}


@router.patch("/{pickup_id}/payment_status")
def update_payment(
    pickup_id: str, payload: PaymentUpdate, user_id: str = Depends(require_role(["farmer"]))
) -> dict[str, str]:
    pickup_service.set_payment_status(user_id, pickup_id, payload.payment_status)
    return {"data": "success"}
