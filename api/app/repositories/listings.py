from datetime import date
from typing import Any

from app.core.enums import ListingSource, ListingStatus
from app.repositories._db import Row, db, first, one, rows

_COLUMNS = "id, farmer_id, plot_id, est_tonnes, harvest_date, status, pool_id, source"


def insert_listing(
    farmer_id: str, plot_id: str, est_tonnes: float, harvest_date: date, combine_sms_used: bool, source: ListingSource
) -> Row:
    res = (
        db()
        .table("listings")
        .insert(
            {
                "farmer_id": farmer_id,
                "plot_id": plot_id,
                "est_tonnes": est_tonnes,
                "harvest_date": harvest_date.isoformat(),
                "combine_sms_used": combine_sms_used,
                "source": source.value,
            }
        )
        .execute()
    )
    return one(res)


def get_listing(listing_id: str) -> Row | None:
    return first(db().table("listings").select(_COLUMNS).eq("id", listing_id).execute())


def update_listing(listing_id: str, fields: dict[str, Any]) -> None:
    db().table("listings").update(fields).eq("id", listing_id).execute()


def set_listing_status(listing_id: str, status: ListingStatus) -> None:
    update_listing(listing_id, {"status": status.value})


def list_farmer_listings(farmer_id: str) -> list[Row]:
    res = db().table("listings").select(_COLUMNS).eq("farmer_id", farmer_id).order("created_at", desc=True).execute()
    return rows(res)


def list_pool_listings(pool_id: str) -> list[Row]:
    return rows(db().table("listings").select(_COLUMNS).eq("pool_id", pool_id).execute())
