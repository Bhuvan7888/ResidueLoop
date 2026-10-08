from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Literal
from app.core.security import require_role
from app.services.pickup_service import update_pickup_weight, update_pickup_payment

router = APIRouter(prefix="/pickups", tags=["pickups"])

class WeightUpdate(BaseModel):
    actual_tonnes: float

class PaymentUpdate(BaseModel):
    payment_status: Literal["pending", "received", "not_received"]

@router.patch("/{pickup_id}/weight")
async def update_weight(
    pickup_id: str,
    payload: WeightUpdate,
    user_id: str = Depends(require_role(["buyer"]))
):
    await update_pickup_weight(user_id, pickup_id, payload.actual_tonnes)
    return {"data": "success"}

@router.patch("/{pickup_id}/payment_status")
async def update_payment(
    pickup_id: str,
    payload: PaymentUpdate,
    user_id: str = Depends(require_role(["farmer"]))
):
    await update_pickup_payment(user_id, pickup_id, payload.payment_status)
    return {"data": "success"}
