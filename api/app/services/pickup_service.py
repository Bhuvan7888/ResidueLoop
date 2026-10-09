import logging
from datetime import UTC, datetime
from typing import Any

from app.core.enums import ListingStatus, PaymentStatus, PoolStatus
from app.core.errors import ConflictError, DomainError, NotFoundError
from app.repositories import listings, offers, pickups, pools

logger = logging.getLogger(__name__)


def compute_amount_due(weighed_tonnes: float, price_per_tonne: float) -> float:
    return round(weighed_tonnes * price_per_tonne, 2)


def queue_verification(listing_id: str) -> None:
    # MOCK: the satellite verification job arrives with Unit 07. This keeps the call site stable.
    logger.info("verification queued (stub) listing=%s", listing_id)


def _pickup_of_buyer(buyer_id: str, pickup_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    pickup = pickups.get_pickup(pickup_id)
    pool = pools.get_pool(pickup["pool_id"]) if pickup else None
    if pickup is None or pool is None or pool["buyer_id"] != buyer_id:
        raise NotFoundError("Pickup not found")
    return pickup, pool


def record_weight(buyer_id: str, pickup_id: str, weighed_tonnes: float, quality_notes: str | None) -> float:
    pickup, _ = _pickup_of_buyer(buyer_id, pickup_id)
    if weighed_tonnes <= 0:
        raise DomainError("Weighed tonnes must be above zero")
    offer = offers.accepted_offer_for_listing(pickup["listing_id"])
    if offer is None:
        raise ConflictError("No accepted offer for this pickup")
    amount = compute_amount_due(weighed_tonnes, float(offer["price_per_tonne"]))
    pickups.update_pickup(
        pickup_id, {"weighed_tonnes": weighed_tonnes, "amount_due": amount, "quality_notes": quality_notes}
    )
    return amount


def complete_pickup(buyer_id: str, pickup_id: str) -> None:
    pickup, pool = _pickup_of_buyer(buyer_id, pickup_id)
    if pickup["weighed_tonnes"] is None:
        raise ConflictError("Enter the weighed tonnes before completing the pickup")
    pickups.update_pickup(pickup_id, {"completed_at": datetime.now(UTC).isoformat()})
    listings.set_listing_status(pickup["listing_id"], ListingStatus.COMPLETED)
    queue_verification(pickup["listing_id"])
    pool_listings = listings.list_pool_listings(pool["id"])
    if all(item["status"] == ListingStatus.COMPLETED for item in pool_listings):
        pools.set_pool_status(pool["id"], PoolStatus.COMPLETED)


def set_payment_status(farmer_id: str, pickup_id: str, status: PaymentStatus) -> None:
    pickup = pickups.get_pickup(pickup_id)
    listing = listings.get_listing(pickup["listing_id"]) if pickup else None
    if pickup is None or listing is None or listing["farmer_id"] != farmer_id:
        raise NotFoundError("Pickup not found")
    pickups.update_pickup(pickup_id, pickups.payment_fields(status))
