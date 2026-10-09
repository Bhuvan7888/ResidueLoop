from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from app.core.errors import DomainError
from app.core.security import require_role
from app.services import farmer_service

router = APIRouter(prefix="/farmers", tags=["farmers"])

MAX_ID_UPLOAD_BYTES = 5 * 1024 * 1024


class PlotCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    village_id: str
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    acres: float = Field(gt=0, le=1000)


@router.post("/plots")
def add_plot(plot: PlotCreate, user_id: str = Depends(require_role(["farmer"]))) -> dict[str, object]:
    created = farmer_service.create_plot(user_id, plot.village_id, plot.lat, plot.lng, plot.acres)
    return {"data": {"id": created["id"]}}


@router.post("/id_verification")
async def upload_id(
    id_type: str = Form(...),
    id_last4: str = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(require_role(["farmer"])),
) -> dict[str, object]:
    if file.size is None or file.size > MAX_ID_UPLOAD_BYTES:
        raise DomainError("File must be 5 MB or smaller")
    status = await farmer_service.upload_id_document(user_id, id_type, id_last4, file)
    return {"data": {"status": status.value}}
