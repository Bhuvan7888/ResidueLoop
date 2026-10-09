from datetime import datetime

from app.core.enums import OfferStatus
from app.repositories._db import Row, db, first, one, rows

_COLUMNS = "id, listing_id, buyer_id, baler_id, status, price_per_tonne, pickup_start, pickup_end"


def match_candidates(listing_id: str) -> list[Row]:
    return rows(db().rpc("listing_match_candidates", {"p_listing_id": listing_id}).execute())


def insert_offer(
    listing_id: str, buyer_id: str, baler_id: str, price_per_tonne: float, pickup_start: datetime, pickup_end: datetime
) -> Row:
    res = (
        db()
        .table("offers")
        .insert(
            {
                "listing_id": listing_id,
                "buyer_id": buyer_id,
                "baler_id": baler_id,
                "status": OfferStatus.PENDING.value,
                "price_per_tonne": price_per_tonne,
                "pickup_start": pickup_start.isoformat(),
                "pickup_end": pickup_end.isoformat(),
            }
        )
        .execute()
    )
    return one(res)


def get_offer(offer_id: str) -> Row | None:
    return first(db().table("offers").select(_COLUMNS).eq("id", offer_id).execute())


def set_offer_status(offer_id: str, status: OfferStatus) -> None:
    db().table("offers").update({"status": status.value}).eq("id", offer_id).execute()


def accepted_offer_for_listing(listing_id: str) -> Row | None:
    res = (
        db()
        .table("offers")
        .select(_COLUMNS)
        .eq("listing_id", listing_id)
        .eq("status", OfferStatus.ACCEPTED.value)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return first(res)


def latest_pending_offer(listing_ids: list[str]) -> Row | None:
    res = (
        db()
        .table("offers")
        .select(_COLUMNS)
        .in_("listing_id", listing_ids)
        .eq("status", OfferStatus.PENDING.value)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return first(res)
