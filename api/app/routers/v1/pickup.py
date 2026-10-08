from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import require_role
from app.services.pickup_service import update_pickup

router = APIRouter(prefix="/pickups", tags=["pickups"])

class PickupUpdate(BaseModel):
    actual_tonnes: float
    payment_status: str

@router.patch("/{pickup_id}")
async def update(
    pickup_id: str,
    payload: PickupUpdate,
    user_id: str = Depends(require_role(["baler"]))
):
    await update_pickup(user_id, pickup_id, payload.actual_tonnes, payload.payment_status)
    return {"data": "success"}
