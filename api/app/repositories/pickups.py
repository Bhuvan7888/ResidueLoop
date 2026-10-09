from datetime import UTC, datetime
from typing import Any

from app.core.enums import PaymentStatus
from app.repositories._db import Row, db, first

_COLUMNS = (
    "id, pool_id, listing_id, weighed_tonnes, amount_due, payment_status, payment_updated_at, quality_notes, completed_at"
)


def upsert_pickup(pool_id: str, listing_id: str) -> None:
    db().table("pickups").upsert({"pool_id": pool_id, "listing_id": listing_id}, on_conflict="listing_id").execute()


def get_pickup(pickup_id: str) -> Row | None:
    return first(db().table("pickups").select(_COLUMNS).eq("id", pickup_id).execute())


def pickup_for_listing(listing_id: str) -> Row | None:
    return first(db().table("pickups").select(_COLUMNS).eq("listing_id", listing_id).execute())


def update_pickup(pickup_id: str, fields: dict[str, Any]) -> None:
    db().table("pickups").update(fields).eq("id", pickup_id).execute()


def payment_fields(status: PaymentStatus) -> dict[str, Any]:
    return {"payment_status": status.value, "payment_updated_at": datetime.now(UTC).isoformat()}
