from datetime import UTC, date, datetime, timedelta
from typing import Any

from app.core.config import Settings, get_settings
from app.core.enums import ListingStatus, OfferStatus, PoolStatus
from app.core.errors import ConflictError, NotFoundError
from app.repositories import buyers, listings, offers, pickups, plots, pools


def score_buyer(
    distance_km: float, price: float, capacity: float, best_price: float, est_tonnes: float, settings: Settings
) -> float:
    """Weighted sum of distance, price, capacity fit and availability. Higher is better."""
    distance_score = max(0.0, 1 - distance_km / settings.match_max_distance_km)
    price_score = price / best_price if best_price else 0.0
    capacity_score = min(1.0, capacity / est_tonnes) if est_tonnes else 0.0
    return (
        settings.match_weight_distance * distance_score
        + settings.match_weight_price * price_score
        + settings.match_weight_capacity * capacity_score
        + settings.match_weight_availability
    )


def pick_best_buyer(candidates: list[dict[str, Any]], est_tonnes: float, settings: Settings) -> dict[str, Any] | None:
    nearby = [c for c in candidates if c["distance_km"] <= settings.match_max_distance_km]
    best_price = max((float(c["price_per_tonne"]) for c in nearby), default=0.0)
    if not nearby:
        return None
    return max(
        nearby,
        key=lambda c: score_buyer(
            c["distance_km"], float(c["price_per_tonne"]), float(c["capacity"]), best_price, est_tonnes, settings
        ),
    )


def pick_nearest_baler(candidates: list[dict[str, Any]]) -> dict[str, Any] | None:
    return min(candidates, key=lambda c: c["distance_km"], default=None)


def match_listing(user_id: str, listing_id: str) -> dict[str, Any] | None:
    settings = get_settings()
    listing = listings.get_listing(listing_id)
    if listing is None or listing["farmer_id"] != user_id:
        raise NotFoundError("Listing not found")

    candidates = offers.match_candidates(listing_id)
    buyer = pick_best_buyer([c for c in candidates if c["kind"] == "buyer"], float(listing["est_tonnes"]), settings)
    baler = pick_nearest_baler([c for c in candidates if c["kind"] == "baler"])
    if buyer is None or baler is None:
        return None

    start = datetime.now(UTC) + timedelta(days=settings.pool_pickup_lead_days)
    end = start + timedelta(days=settings.offer_pickup_window_days)
    offer = offers.insert_offer(listing_id, buyer["id"], baler["id"], float(buyer["price_per_tonne"]), start, end)
    listings.set_listing_status(listing_id, ListingStatus.MATCHED)
    return offer


def _owned_pending_offer(user_id: str, offer_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    offer = offers.get_offer(offer_id)
    listing = listings.get_listing(offer["listing_id"]) if offer else None
    if offer is None or listing is None or listing["farmer_id"] != user_id:
        raise NotFoundError("Offer not found")
    if offer["status"] != OfferStatus.PENDING:
        raise ConflictError("This offer was already answered")
    return offer, listing


def pool_state(current_tonnes: float, target_tonnes: float, today: date, lead_days: int) -> tuple[PoolStatus, date | None]:
    """A pool is ready once it reaches the buyer's minimum load, and then gets one pickup date."""
    if current_tonnes >= target_tonnes:
        return PoolStatus.READY, today + timedelta(days=lead_days)
    return PoolStatus.FORMING, None


def accept_offer(user_id: str, offer_id: str) -> dict[str, Any]:
    settings = get_settings()
    offer, listing = _owned_pending_offer(user_id, offer_id)
    plot = plots.get_plot(listing["plot_id"])
    buyer = buyers.get_buyer(offer["buyer_id"])
    if plot is None or buyer is None:
        raise NotFoundError("Offer not found")

    pool = pools.find_forming_pool(offer["buyer_id"], plot["village_id"]) or pools.insert_pool(
        plot["village_id"], offer["buyer_id"], offer["baler_id"], float(buyer["min_load_tonnes"])
    )
    tonnes = float(pool["current_tonnes"]) + float(listing["est_tonnes"])
    status, pickup_date = pool_state(tonnes, float(pool["target_tonnes"]), datetime.now(UTC).date(), settings.pool_pickup_lead_days)

    pools.update_pool(pool["id"], tonnes, status, pickup_date)
    offers.set_offer_status(offer_id, OfferStatus.ACCEPTED)
    listings.update_listing(listing["id"], {"pool_id": pool["id"], "status": ListingStatus.POOLED.value})
    pickups.upsert_pickup(pool["id"], listing["id"])
    return {"pool_id": pool["id"], "pool_status": status.value, "current_tonnes": tonnes, "pickup_date": pickup_date}


def decline_offer(user_id: str, offer_id: str) -> None:
    _, listing = _owned_pending_offer(user_id, offer_id)
    offers.set_offer_status(offer_id, OfferStatus.DECLINED)
    listings.set_listing_status(listing["id"], ListingStatus.OPEN)
