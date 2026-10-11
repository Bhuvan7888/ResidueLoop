from typing import Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import require_role
from app.services.charity_service import (
    get_ranked_villages, create_donation, create_assistance_request, 
    update_request_status, create_disbursement, get_crowdfunding_campaigns
)

router = APIRouter(prefix="/charity", tags=["charity"])

class DonationCreate(BaseModel):
    ngo_id: Optional[str] = None
    amount: float
    target_village_id: Optional[str] = None
    campaign_id: Optional[str] = None

class AssistanceRequestCreate(BaseModel):
    listing_id: str
    amount_requested: float = 2500.0
    purpose: Optional[str] = "Emergency citizen crowdfunding clearance"
    ngo_id: Optional[str] = None

class RequestStatusUpdate(BaseModel):
    status: str

class DisbursementCreate(BaseModel):
    payee_name: str
    amount: float
    payee_type: Optional[str] = "baler"
    note: Optional[str] = None

CITY_COORDINATES = {
    "delhi": (28.7041, 77.1025),
    "chandigarh": (30.7333, 76.7794),
    "ludhiana": (30.9010, 75.8573),
    "amritsar": (31.6340, 74.8723),
    "bathinda": (30.2110, 74.9455),
}

@router.get("/villages/ranked")
async def fetch_ranked_villages(city: str = "Delhi") -> list[dict[str, Any]]:
    city_clean = city.lower().strip()
    lat, lon = CITY_COORDINATES.get("delhi", (28.7041, 77.1025))
    for k, coords in CITY_COORDINATES.items():
        if k in city_clean:
            lat, lon = coords
            break
    return await get_ranked_villages(lat, lon)

@router.get("/campaigns")
async def list_campaigns() -> dict[str, Any]:
    campaigns = await get_crowdfunding_campaigns()
    return {"data": campaigns}

@router.post("/donate")
async def donate(
    payload: DonationCreate, user_id: str = Depends(require_role(["donor", "farmer", "buyer", "ngo"]))
) -> dict[str, Any]:
    res = await create_donation(
        user_id,
        payload.ngo_id or "",
        payload.amount,
        payload.target_village_id,
        payload.campaign_id
    )
    return {"data": res}

@router.post("/requests")
async def request_assistance(
    payload: AssistanceRequestCreate, user_id: str = Depends(require_role(["farmer"]))
) -> dict[str, Any]:
    res = await create_assistance_request(
        user_id,
        payload.ngo_id,
        payload.listing_id,
        payload.amount_requested,
        payload.purpose or "Emergency citizen crowdfunding clearance"
    )
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
    res = await create_disbursement(
        user_id,
        request_id,
        payload.payee_name,
        payload.amount,
        payload.payee_type or "baler",
        payload.note,
    )
    return {"data": res}
