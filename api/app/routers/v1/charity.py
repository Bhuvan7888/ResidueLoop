from typing import Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.security import require_role
from app.services.charity_service import (
    get_ranked_villages, create_donation, create_assistance_request, 
    update_request_status, create_disbursement
)

router = APIRouter(prefix="/charity", tags=["charity"])

class DonationCreate(BaseModel):
    ngo_id: str
    amount: float
    target_village_id: Optional[str] = None

class AssistanceRequestCreate(BaseModel):
    ngo_id: str
    listing_id: str
    amount_requested: float
    purpose: str

class RequestStatusUpdate(BaseModel):
    status: str

class DisbursementCreate(BaseModel):
    payee_name: str
    amount: float

@router.get("/villages/ranked")
async def fetch_ranked_villages(city: str = "Delhi") -> list[dict[str, Any]]:
    # Mocking Delhi lat/lon
    lat, lon = 28.7041, 77.1025
    return await get_ranked_villages(lat, lon)

@router.post("/donate")
async def donate(
    payload: DonationCreate, user_id: str = Depends(require_role(["donor", "authenticated"]))
) -> dict[str, Any]:
    # 'authenticated' in test since anyone can test donation flow
    res = await create_donation(user_id, payload.ngo_id, payload.amount, payload.target_village_id)
    return {"data": res}

@router.post("/requests")
async def request_assistance(
    payload: AssistanceRequestCreate, user_id: str = Depends(require_role(["farmer"]))
) -> dict[str, Any]:
    res = await create_assistance_request(user_id, payload.ngo_id, payload.listing_id, payload.amount_requested, payload.purpose)
    return {"data": res}

@router.patch("/requests/{request_id}/status")
async def update_status(
    request_id: str,
    payload: RequestStatusUpdate,
    user_id: str = Depends(require_role(["ngo"])),
) -> dict[str, Any]:
    await update_request_status(user_id, request_id, payload.status)
    return {"data": "success"}

@router.post("/requests/{request_id}/disbursements")
async def record_disbursement(
    request_id: str,
    payload: DisbursementCreate,
    user_id: str = Depends(require_role(["ngo"])),
) -> dict[str, Any]:
    res = await create_disbursement(user_id, request_id, payload.payee_name, payload.amount)
    return {"data": res}
