from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import require_role
from app.services import heatmap_service

router = APIRouter(prefix="/heatmap", tags=["heatmap"])


class VillageHeat(BaseModel):
    village_id: str
    name: str
    lat: float
    lng: float
    demand_tonnes: float
    supply_tonnes: float
    unfilled_tonnes: float
    is_unfilled_zone: bool


@router.get("/villages")
def village_heatmap() -> dict[str, list[VillageHeat]]:
    return {"data": [VillageHeat(**zone) for zone in heatmap_service.get_village_heatmap()]}
