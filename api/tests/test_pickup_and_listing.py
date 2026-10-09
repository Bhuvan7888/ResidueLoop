from datetime import date
from typing import Any

import pytest

from app.core.enums import PaymentStatus
from app.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError
from app.services import farmer_service, listing_service, pickup_service


def test_amount_due_is_weighed_tonnes_times_price() -> None:
    assert pickup_service.compute_amount_due(6.5, 1800) == 11700.0
    assert pickup_service.compute_amount_due(0.333, 1800) == 599.4


def _patch_pickup(monkeypatch: pytest.MonkeyPatch, pickup: dict[str, Any], pool_buyer: str = "buyer-1") -> list[dict[str, Any]]:
    updates: list[dict[str, Any]] = []
    p = "app.services.pickup_service"
    monkeypatch.setattr(f"{p}.pickups.get_pickup", lambda pid: pickup)
    monkeypatch.setattr(f"{p}.pools.get_pool", lambda pid: {"id": "pool1", "buyer_id": pool_buyer})
    monkeypatch.setattr(f"{p}.offers.accepted_offer_for_listing", lambda lid: {"price_per_tonne": 1800})
    monkeypatch.setattr(f"{p}.pickups.update_pickup", lambda pid, fields: updates.append(fields))
    monkeypatch.setattr(f"{p}.listings.get_listing", lambda lid: {"id": lid, "farmer_id": "farmer-1", "status": "pooled"})
    return updates


def test_buyer_of_the_pool_records_weight(monkeypatch: pytest.MonkeyPatch) -> None:
    updates = _patch_pickup(monkeypatch, {"id": "k1", "pool_id": "pool1", "listing_id": "l1", "weighed_tonnes": None})
    assert pickup_service.record_weight("buyer-1", "k1", 5.0, "dry") == 9000.0
    assert updates[0]["amount_due"] == 9000.0


def test_other_buyer_cannot_weigh_a_pickup(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_pickup(monkeypatch, {"id": "k1", "pool_id": "pool1", "listing_id": "l1"})
    with pytest.raises(NotFoundError):
        pickup_service.record_weight("buyer-2", "k1", 5.0, None)


def test_weight_must_be_positive(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_pickup(monkeypatch, {"id": "k1", "pool_id": "pool1", "listing_id": "l1"})
    with pytest.raises(DomainError):
        pickup_service.record_weight("buyer-1", "k1", 0, None)


def test_pickup_cannot_complete_without_weight(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_pickup(monkeypatch, {"id": "k1", "pool_id": "pool1", "listing_id": "l1", "weighed_tonnes": None})
    with pytest.raises(ConflictError):
        pickup_service.complete_pickup("buyer-1", "k1")


def test_farmer_sets_payment_on_own_pickup_only(monkeypatch: pytest.MonkeyPatch) -> None:
    updates = _patch_pickup(monkeypatch, {"id": "k1", "pool_id": "pool1", "listing_id": "l1"})
    pickup_service.set_payment_status("farmer-1", "k1", PaymentStatus.RECEIVED)
    assert updates[0]["payment_status"] == "received"
    with pytest.raises(NotFoundError):
        pickup_service.set_payment_status("farmer-2", "k1", PaymentStatus.RECEIVED)


def _patch_listing(monkeypatch: pytest.MonkeyPatch, id_status: str, plot_owner: str = "farmer-1") -> list[Any]:
    inserted: list[Any] = []
    p = "app.services.listing_service"
    monkeypatch.setattr(f"{p}.farmers.get_farmer", lambda uid: {"profile_id": uid, "id_status": id_status})
    monkeypatch.setattr(f"{p}.plots.get_plot", lambda pid: {"id": pid, "farmer_id": plot_owner, "acres": 4.0})

    def insert(*args: Any) -> dict[str, Any]:
        inserted.append(args)
        return {"id": "l1"}

    monkeypatch.setattr(f"{p}.listings.insert_listing", insert)
    monkeypatch.setattr(f"{p}.matching_service.match_listing", lambda uid, lid: {"id": "o1"})
    return inserted


def test_unverified_farmer_cannot_list(monkeypatch: pytest.MonkeyPatch) -> None:
    inserted = _patch_listing(monkeypatch, "pending")
    with pytest.raises(ForbiddenError):
        listing_service.create_listing("farmer-1", "p1", date(2026, 10, 20), True)
    assert inserted == []


def test_other_farmers_plot_is_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_listing(monkeypatch, "verified", plot_owner="farmer-2")
    with pytest.raises(NotFoundError):
        listing_service.create_listing("farmer-1", "p1", date(2026, 10, 20), True)


def test_verified_farmer_listing_gets_estimate_and_offer(monkeypatch: pytest.MonkeyPatch) -> None:
    inserted = _patch_listing(monkeypatch, "verified")
    result = listing_service.create_listing("farmer-1", "p1", date(2026, 10, 20), True)
    assert result == {"id": "l1", "est_tonnes": 10.0, "offer_id": "o1"}
    assert len(inserted) == 1


def test_estimate_outside_bounds_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_listing(monkeypatch, "verified")
    with pytest.raises(DomainError):
        listing_service.create_listing("farmer-1", "p1", date(2026, 10, 20), True, est_tonnes=40.0)


def test_mock_id_review_rejects_seeded_case_and_approves_others() -> None:
    assert farmer_service.review_id("0000")[0] == "rejected"
    assert farmer_service.review_id("1234") == ("verified", None)


def test_plot_radius_matches_area() -> None:
    assert farmer_service.plot_radius_m(1.0) == pytest.approx(35.9, abs=0.1)
