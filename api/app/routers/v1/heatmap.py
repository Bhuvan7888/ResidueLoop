from fastapi import APIRouter
from pydantic import BaseModel

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
    district: str = "Punjab"
    surplus_tonnes: float = 0.0
    is_surplus_zone: bool = False
    listings_count: int = 0
    avg_price: float = 1500.0
    status: str = "balanced"


@router.get("/villages")
def village_heatmap() -> dict[str, list[VillageHeat]]:
    return {"data": [VillageHeat(**zone) for zone in heatmap_service.get_village_heatmap()]}

