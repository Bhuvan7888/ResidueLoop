from typing import Any
from app.core.security import get_supabase_client


def village_demand_supply() -> list[dict[str, Any]]:
    client = get_supabase_client()
    res = client.rpc("village_demand_supply", {}).execute()
    return list(res.data) if res.data else []
