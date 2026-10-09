from app.core.enums import IdStatus
from app.repositories._db import Row, db, first


def get_farmer(profile_id: str) -> Row | None:
    res = db().table("farmers").select("profile_id, village_id, id_status").eq("profile_id", profile_id).execute()
    return first(res)


def ensure_farmer(profile_id: str, village_id: str) -> None:
    db().table("farmers").upsert({"profile_id": profile_id, "village_id": village_id}).execute()


def set_id_status(profile_id: str, status: IdStatus) -> None:
    db().table("farmers").update({"id_status": status.value}).eq("profile_id", profile_id).execute()


def insert_id_verification(
    farmer_id: str, id_type: str, id_last4: str, document_path: str, status: IdStatus, reason: str | None
) -> None:
    db().table("id_verifications").insert(
        {
            "farmer_id": farmer_id,
            "id_type": id_type,
            "id_last4": id_last4,
            "document_path": document_path,
            "status": status.value,
            "rejection_reason": reason,
        }
    ).execute()
