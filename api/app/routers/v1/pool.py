from typing import Any
from fastapi import APIRouter
from app.core.security import get_supabase_client

router = APIRouter(prefix="/pools", tags=["pools"])

@router.get("")
async def list_pools() -> dict[str, Any]:
    client = get_supabase_client()
    try:
        res = client.table("pools").select(
            "*, listings(*, plots(*, villages(*))), villages(id, name, district, geometry)"
        ).order("created_at", desc=True).execute()
        return {"data": res.data or []}
    except Exception as e:
        # Fallback to basic pools query if relation issues
        res = client.table("pools").select("*, villages(name, district)").order("created_at", desc=True).execute()
        return {"data": res.data or []}
