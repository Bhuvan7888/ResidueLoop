from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/health", tags=["health"])

class HealthResponse(BaseModel):
    data: str

@router.get("", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(data="ok")
