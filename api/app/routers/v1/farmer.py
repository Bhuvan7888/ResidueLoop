from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.core.security import get_current_user_id
from app.services.farmer_service import upload_id_document, create_plot

router = APIRouter(prefix="/farmers", tags=["farmers"])

class PlotCreate(BaseModel):
    village_id: str
    lat: float
    lng: float
    acres: float

@router.post("/plots")
async def add_plot(
    plot: PlotCreate,
    user_id: str = Depends(get_current_user_id)
):
    await create_plot(user_id, plot)
    return {"data": "success"}

@router.post("/id_verification")
async def upload_id(
    id_type: str = Form(...),
    id_last4: str = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    # 5MB limit check is usually done in middleware or here
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
        
    await upload_id_document(user_id, id_type, id_last4, file)
    return {"data": "success"}
