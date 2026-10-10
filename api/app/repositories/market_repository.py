from typing import Any


class MarketRepository:
    """Persists buyer demand and farmer listings through the service role."""

    def __init__(self, client: Any) -> None:
        self._client = client

    def upsert_buyer(self, profile_id: str, payload: dict[str, Any]) -> None:
        self._client.table("buyers").upsert({"profile_id": profile_id, **payload}).execute()

    def create_demand(self, buyer_id: str, payload: dict[str, Any]) -> str:
        response = self._client.table("demand_posts").insert({"buyer_id": buyer_id, **payload}).execute()
        return str(response.data[0]["id"])

    def get_demand_owner(self, demand_id: str) -> str | None:
        response = self._client.table("demand_posts").select("buyer_id").eq("id", demand_id).execute()
        return str(response.data[0]["buyer_id"]) if response.data else None

    def update_demand(self, demand_id: str, payload: dict[str, Any]) -> None:
        self._client.table("demand_posts").update(payload).eq("id", demand_id).execute()

    def get_farmer_status(self, farmer_id: str) -> str | None:
        response = self._client.table("farmers").select("id_status").eq("profile_id", farmer_id).execute()
        return str(response.data[0]["id_status"]) if response.data else None

    def owns_plot(self, farmer_id: str, plot_id: str) -> bool:
        response = self._client.table("plots").select("id").eq("id", plot_id).eq("farmer_id", farmer_id).execute()
        return bool(response.data)

    def create_listing(self, farmer_id: str, payload: dict[str, Any]) -> str:
        response = self._client.table("listings").insert({"farmer_id": farmer_id, **payload}).execute()
        return str(response.data[0]["id"])
