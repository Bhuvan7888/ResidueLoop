from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from app.core.security import require_role
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
    user_id: str = Depends(require_role(["farmer"]))
):
    await create_plot(user_id, plot)
    return {"data": "success"}

@router.post("/id_verification")
async def upload_id(
    id_type: str = Form(...),
    id_last4: str = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(require_role(["farmer"]))
):
    # 5MB limit check is usually done in middleware or here
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
        
    await upload_id_document(user_id, id_type, id_last4, file)
    return {"data": "success"}
