from typing import Any


class ProfileRepository:
    """Owns service-role access to user profiles."""

    def __init__(self, client: Any) -> None:
        self._client = client

    def exists(self, user_id: str) -> bool:
        response = self._client.table("profiles").select("id").eq("id", user_id).limit(1).execute()
        return bool(response.data)

    def create(self, user_id: str, phone: str, role: str) -> dict[str, Any]:
        response = self._client.table("profiles").insert(
            {"id": user_id, "phone": phone, "role": role}
        ).execute()
        return dict(response.data[0])
