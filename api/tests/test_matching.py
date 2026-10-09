from datetime import date
from typing import Any

import pytest

from app.core.config import get_settings
from app.core.enums import OfferStatus, PoolStatus
from app.core.errors import ConflictError, NotFoundError
from app.services import matching_service

FARMER = "farmer-1"
BUYERS = [
    {"kind": "buyer", "id": "near", "price_per_tonne": 1800, "capacity": 500, "distance_km": 10.0},
    {"kind": "buyer", "id": "far", "price_per_tonne": 1900, "capacity": 500, "distance_km": 120.0},
    {"kind": "buyer", "id": "out", "price_per_tonne": 2500, "capacity": 500, "distance_km": 400.0},
]


def test_nearest_buyer_wins_when_prices_are_close() -> None:
    best = matching_service.pick_best_buyer(BUYERS, 10.0, get_settings())
    assert best is not None and best["id"] == "near"


def test_buyers_beyond_max_distance_are_ignored() -> None:
    far_only = [b for b in BUYERS if b["id"] == "out"]
    assert matching_service.pick_best_buyer(far_only, 10.0, get_settings()) is None


def test_small_capacity_lowers_the_score() -> None:
    settings = get_settings()
    full = matching_service.score_buyer(10, 1800, 500, 1800, 10, settings)
    small = matching_service.score_buyer(10, 1800, 2, 1800, 10, settings)
    assert small < full


def test_nearest_baler_is_chosen() -> None:
    balers = [{"id": "a", "distance_km": 30.0}, {"id": "b", "distance_km": 5.0}]
    nearest = matching_service.pick_nearest_baler(balers)
    assert nearest is not None and nearest["id"] == "b"


def test_pool_becomes_ready_at_minimum_load_with_pickup_date() -> None:
    status, pickup = matching_service.pool_state(8.0, 8.0, date(2026, 10, 10), 3)
    assert status == PoolStatus.READY and pickup == date(2026, 10, 13)


def test_pool_keeps_forming_below_minimum_load() -> None:
    status, pickup = matching_service.pool_state(6.5, 8.0, date(2026, 10, 10), 3)
    assert status == PoolStatus.FORMING and pickup is None


class FakeStore:
    """In-memory stand-in for the repositories the matching service calls."""

    def __init__(self, monkeypatch: pytest.MonkeyPatch, offer_status: str = "pending") -> None:
        self.pools: dict[str, dict[str, Any]] = {}
        self.listing: dict[str, Any] = {
            "id": "l1", "farmer_id": FARMER, "plot_id": "p1", "est_tonnes": 5.0, "status": "matched", "pool_id": None,
        }
        self.offer: dict[str, Any] = {
            "id": "o1", "listing_id": "l1", "buyer_id": "b1", "baler_id": "bal1",
            "status": offer_status, "price_per_tonne": 1800,
        }
        self.pickups: list[tuple[str, str]] = []
        self.offer_status_set: list[str] = []
        m = monkeypatch
        m.setattr("app.services.matching_service.offers.get_offer", lambda oid: self.offer if oid == "o1" else None)
        m.setattr("app.services.matching_service.listings.get_listing", lambda lid: self.listing)
        m.setattr("app.services.matching_service.plots.get_plot", lambda pid: {"id": "p1", "village_id": "v1"})
        m.setattr("app.services.matching_service.buyers.get_buyer", lambda bid: {"min_load_tonnes": 8})
        m.setattr("app.services.matching_service.pools.find_forming_pool", self.find_pool)
        m.setattr("app.services.matching_service.pools.insert_pool", self.insert_pool)
        m.setattr("app.services.matching_service.pools.update_pool", self.update_pool)
        m.setattr("app.services.matching_service.offers.set_offer_status", lambda oid, s: self.offer_status_set.append(s.value))
        m.setattr("app.services.matching_service.listings.update_listing", lambda lid, fields: self.listing.update(fields))
        m.setattr("app.services.matching_service.listings.set_listing_status", lambda lid, s: self.listing.update(status=s.value))
        m.setattr("app.services.matching_service.pickups.upsert_pickup", lambda pool, lst: self.pickups.append((pool, lst)))

    def find_pool(self, buyer_id: str, village_id: str) -> dict[str, Any] | None:
        return next((p for p in self.pools.values() if p["status"] == "forming"), None)

    def insert_pool(self, village_id: str, buyer_id: str, baler_id: str, target: float) -> dict[str, Any]:
        pool = {"id": "pool1", "current_tonnes": 0, "target_tonnes": target, "status": "forming"}
        self.pools["pool1"] = pool
        return pool

    def update_pool(self, pool_id: str, tonnes: float, status: PoolStatus, pickup: date | None) -> None:
        self.pools[pool_id].update(current_tonnes=tonnes, status=status.value, pickup_date=pickup)


def test_accept_offer_creates_pool_and_pickup_row(monkeypatch: pytest.MonkeyPatch) -> None:
    store = FakeStore(monkeypatch)
    result = matching_service.accept_offer(FARMER, "o1")
    assert result["pool_id"] == "pool1" and result["current_tonnes"] == 5.0
    assert store.listing["pool_id"] == "pool1" and store.listing["status"] == "pooled"
    assert store.pickups == [("pool1", "l1")]
    assert store.offer_status_set == [OfferStatus.ACCEPTED.value]


def test_second_farmer_fills_pool_and_fixes_pickup_date(monkeypatch: pytest.MonkeyPatch) -> None:
    store = FakeStore(monkeypatch)
    matching_service.accept_offer(FARMER, "o1")
    store.offer["status"] = "pending"
    store.listing["est_tonnes"] = 4.0
    result = matching_service.accept_offer(FARMER, "o1")
    assert result["pool_status"] == "ready" and result["pickup_date"] is not None


def test_other_farmers_offer_is_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeStore(monkeypatch)
    with pytest.raises(NotFoundError):
        matching_service.accept_offer("someone-else", "o1")


def test_already_answered_offer_conflicts(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeStore(monkeypatch, offer_status="accepted")
    with pytest.raises(ConflictError):
        matching_service.accept_offer(FARMER, "o1")
