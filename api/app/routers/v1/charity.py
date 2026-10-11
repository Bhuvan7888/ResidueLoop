from typing import Any, Optional
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.core.security import require_role, verify_jwt
from app.services.charity_service import (
    get_ranked_villages, create_donation, create_assistance_request, 
    update_request_status, create_disbursement, get_crowdfunding_campaigns,
    create_stripe_checkout_session, confirm_stripe_donation,
    sync_unsold_listings_to_charity, dispatch_nearby_ngo_mission
)

router = APIRouter(prefix="/charity", tags=["charity"])
optional_bearer = HTTPBearer(auto_error=False)


def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer)
) -> Optional[str]:
    if not credentials:
        return None
    try:
        payload = verify_jwt(credentials)
        return payload.get("sub")
    except Exception:
        return None


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


class StripeCheckoutSessionCreate(BaseModel):
    campaign_id: str
    amount: float
    currency: Optional[str] = "inr"
    return_url: Optional[str] = ""


class StripePaymentConfirm(BaseModel):
    campaign_id: str
    amount: float
    session_id: Optional[str] = None
    donor_id: Optional[str] = None
    is_test_dummy: bool = False


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


@router.post("/stripe/create-checkout-session")
async def create_checkout_session(
    payload: StripeCheckoutSessionCreate,
    user_id: Optional[str] = Depends(get_optional_user_id),
) -> dict[str, Any]:
    """
    Creates a Stripe Checkout Session with the provided Stripe test keys.
    """
    res = await create_stripe_checkout_session(
        campaign_id=payload.campaign_id,
        amount=payload.amount,
        currency=payload.currency or "inr",
        donor_id=user_id,
        return_url=payload.return_url or "",
    )
    return {"data": res}


@router.post("/stripe/confirm-payment")
async def confirm_payment(
    payload: StripePaymentConfirm,
    user_id: Optional[str] = Depends(get_optional_user_id),
) -> dict[str, Any]:
    """
    Confirms Stripe donation, records in Supabase, and automatically calls
    the nearby NGO to dispatch balers and notify the farmer when funded.
    """
    effective_donor = payload.donor_id or user_id
    res = await confirm_stripe_donation(
        campaign_id=payload.campaign_id,
        amount=payload.amount,
        session_id=payload.session_id,
        donor_id=effective_donor,
        is_test_dummy=payload.is_test_dummy,
    )
    return {"data": res}


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


class SyncUnsoldRequest(BaseModel):
    days_threshold: int = 2
    force_demo: bool = False


@router.post("/sync-unsold-listings")
async def sync_unsold(payload: Optional[SyncUnsoldRequest] = None) -> dict[str, Any]:
    """
    Syncs farmer listings unsold by buyers for 2-3 days onto the charity crowdfunding portal.
    Generates farmer demand based on our benchmark stubble clearance cost estimations (₹1,300/acre).
    """
    threshold = payload.days_threshold if payload else 2
    force = payload.force_demo if payload else False
    synced = await sync_unsold_listings_to_charity(days_threshold=threshold, force_demo=force)
    return {"data": synced, "count": len(synced)}


@router.post("/campaigns/{campaign_id}/call-ngo")
async def call_ngo_for_campaign(campaign_id: str) -> dict[str, Any]:
    """
    Automatically calls the nearby NGO to dispatch baler machinery and remove
    the farmer's crop cleanly to prevent field burning.
    """
    res = await dispatch_nearby_ngo_mission(campaign_id)
    return {"data": res}
