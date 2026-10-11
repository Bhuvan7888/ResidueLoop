from datetime import date
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.integrations.sentinel import SentinelClient
from app.main import app
from app.services.verification_service import _evaluate_verdict
from tests.test_routes_access import HEADERS, _as_role, _token

OWN_PLOT = {"id": "p1", "farmer_id": "user-1", "acres": 4, "centre": None, "radius_m": 70}


class _Query:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows

    def select(self, *_: Any) -> "_Query":
        return self

    def eq(self, *_: Any) -> "_Query":
        return self

    def limit(self, *_: Any) -> "_Query":
        return self

    def order(self, *_: Any, **__: Any) -> "_Query":
        return self

    def execute(self) -> Any:
        return type("Response", (), {"data": self._rows})()


class _Client:
    def __init__(self, plot_rows: list[dict[str, Any]]) -> None:
        self._plot_rows = plot_rows

    def table(self, name: str) -> _Query:
        return _Query(self._plot_rows if name == "plots" else [])


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _farmer_with_plots(monkeypatch: pytest.MonkeyPatch, plot_rows: list[dict[str, Any]]) -> None:
    _as_role(monkeypatch, "farmer")
    monkeypatch.setattr("app.routers.v1.verification.get_supabase_client", lambda: _Client(plot_rows))


@pytest.mark.parametrize(
    ("method", "path"),
    [("post", "/api/v1/verifications/trigger/p1"), ("get", "/api/v1/verifications/plot/p1")],
)
def test_verification_routes_need_a_login(client: TestClient, method: str, path: str) -> None:
    assert getattr(client, method)(path, headers=HEADERS).status_code in (401, 403)


def test_other_roles_cannot_use_verification_routes(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _as_role(monkeypatch, "buyer")
    assert client.get("/api/v1/verifications/plot/p1", headers=_token()).status_code == 403


def test_another_farmers_plot_is_not_found(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _farmer_with_plots(monkeypatch, [{**OWN_PLOT, "farmer_id": "someone-else"}])
    assert client.get("/api/v1/verifications/plot/p1", headers=_token()).status_code == 404
    assert client.post("/api/v1/verifications/trigger/p1", headers=_token()).status_code == 404


def test_owner_can_read_their_plot_history(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _farmer_with_plots(monkeypatch, [OWN_PLOT])
    response = client.get("/api/v1/verifications/plot/p1", headers=_token())
    assert response.status_code == 200 and response.json() == {"data": []}


def test_verdict_overrides_are_off_by_default(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _farmer_with_plots(monkeypatch, [OWN_PLOT])
    response = client.post("/api/v1/verifications/trigger/p1?scenario=verified", headers=_token())
    assert response.status_code == 403


async def test_missing_imagery_is_inconclusive_never_verified() -> None:
    assert await SentinelClient().get_nbr_change(30.8, 75.1, date(2026, 10, 1), date(2026, 10, 30)) is None
    verdict, confidence, _, _ = await _evaluate_verdict(30.8, 75.1, 0.07, date(2026, 10, 1), date(2026, 10, 30))
    assert (verdict, confidence) == ("inconclusive", "low")
