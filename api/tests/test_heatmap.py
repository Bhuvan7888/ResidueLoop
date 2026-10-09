import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import heatmap_service
from tests.test_routes_access import HEADERS, _as_role, _token

ROWS = [
    {"village_id": "v1", "name": "Alpha", "lat": 30.8, "lng": 75.1, "demand_tonnes": 40, "supply_tonnes": 10},
    {"village_id": "v2", "name": "Beta", "lat": 30.9, "lng": 75.2, "demand_tonnes": 5, "supply_tonnes": 12},
    {"village_id": "v3", "name": "Empty", "lat": 30.7, "lng": 75.3, "demand_tonnes": 0, "supply_tonnes": 0},
]


def test_zone_is_unfilled_only_while_demand_exceeds_supply() -> None:
    alpha, beta = (heatmap_service.build_zone(row) for row in ROWS[:2])
    assert alpha["unfilled_tonnes"] == 30.0 and alpha["is_unfilled_zone"]
    assert beta["unfilled_tonnes"] == 0.0 and not beta["is_unfilled_zone"]


def test_villages_with_nothing_are_left_out(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.heatmap_service.heatmap.village_demand_supply", lambda: ROWS)
    assert [zone["name"] for zone in heatmap_service.get_village_heatmap()] == ["Alpha", "Beta"]


def test_buyer_gets_village_level_data_only(monkeypatch: pytest.MonkeyPatch) -> None:
    _as_role(monkeypatch, "buyer")
    monkeypatch.setattr("app.services.heatmap_service.heatmap.village_demand_supply", lambda: ROWS)
    response = TestClient(app).get("/api/v1/heatmap/villages", headers=_token())
    assert response.status_code == 200
    keys = set().union(*(zone.keys() for zone in response.json()["data"]))
    assert keys == {
        "village_id", "name", "lat", "lng", "demand_tonnes", "supply_tonnes", "unfilled_tonnes", "is_unfilled_zone",
    }


@pytest.mark.parametrize("role", ["farmer", "donor", "ngo"])
def test_other_roles_cannot_open_the_heatmap(monkeypatch: pytest.MonkeyPatch, role: str) -> None:
    _as_role(monkeypatch, role)
    assert TestClient(app).get("/api/v1/heatmap/villages", headers=_token()).status_code == 403


def test_heatmap_requires_a_token() -> None:
    assert TestClient(app).get("/api/v1/heatmap/villages", headers=HEADERS).status_code in (401, 403)
