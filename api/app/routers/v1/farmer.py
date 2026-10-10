from typing import Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from app.core.security import require_role
from app.schemas.farmer import FarmerProfileCreate, PlotCreate
from app.services.farmer_service import create_farmer_profile, create_plot, upload_id_document

router = APIRouter(prefix="/farmers", tags=["farmers"])

@router.post("/profile")
async def create_profile(
    profile: FarmerProfileCreate,
    user_id: str = Depends(require_role(["farmer"])),
) -> dict[str, Any]:
    await create_farmer_profile(user_id, profile)
    return {"data": "success"}


@router.post("/plots")
async def add_plot(
    plot: PlotCreate,
    user_id: str = Depends(require_role(["farmer"]))
) -> dict[str, Any]:
    plot_id = await create_plot(user_id, plot)
    return {"data": {"id": plot_id}}

@router.post("/id_verification")
async def upload_id(
    id_type: str = Form(..., min_length=1, max_length=40),
    id_last4: str = Form(..., pattern=r"^\d{4}$"),
    file: UploadFile = File(...),
    user_id: str = Depends(require_role(["farmer"]))
) -> dict[str, Any]:
    # 5MB limit check is usually done in middleware or here
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
        
    verification_status = await upload_id_document(user_id, id_type, id_last4, file)
    return {"data": {"status": verification_status}}
