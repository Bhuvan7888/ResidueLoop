from app.core.security import get_supabase_client
from fastapi import HTTPException

async def update_pickup(user_id: str, pickup_id: str, actual_tonnes: float, payment_status: str) -> None:
    client = get_supabase_client()
    
    # 1. Update pickup
    # For now, it's mocked
    pass
