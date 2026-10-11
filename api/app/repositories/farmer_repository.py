from typing import Any


class FarmerRepository:
    """Database and private-storage access for the farmer workflow."""

    def __init__(self, client: Any) -> None:
        self._client = client

    def upsert_profile(self, user_id: str, name: str, language: str) -> None:
        self._client.table("profiles").update({"name": name, "language": language}).eq("id", user_id).execute()

    def upsert_farmer(self, user_id: str, village_id: str) -> None:
        self._client.table("farmers").upsert({"profile_id": user_id, "village_id": village_id}).execute()

    def create_plot(self, farmer_id: str, payload: dict[str, Any]) -> str:
        if payload.get("village_id"):
            self._client.table("farmers").upsert({"profile_id": farmer_id, "village_id": payload["village_id"]}).execute()
        response = self._client.table("plots").insert({"farmer_id": farmer_id, **payload}).execute()
        return str(response.data[0]["id"])

    def upload_document(self, path: str, content: bytes) -> None:
        self._client.storage.from_("id-documents").upload(
            path,
            content,
            file_options={"content-type": "application/octet-stream", "upsert": "false"},
        )

    def create_verification(self, payload: dict[str, Any]) -> str:
        response = self._client.table("id_verifications").insert(payload).execute()
        return str(response.data[0]["id"])

    def update_farmer_status(self, farmer_id: str, status: str) -> None:
        self._client.table("farmers").update({"id_status": status}).eq("profile_id", farmer_id).execute()
