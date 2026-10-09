import time
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import app

HEADERS = {"host": "localhost"}
SECRET = "test-jwt-secret-with-at-least-32-chars!"


def _token(sub: str = "user-1") -> dict[str, str]:
    payload = {"sub": sub, "aud": "authenticated", "exp": int(time.time()) + 600}
    return {**HEADERS, "Authorization": f"Bearer {jwt.encode(payload, SECRET, algorithm='HS256')}"}


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_listing_requires_a_token(client: TestClient) -> None:
    assert client.post("/api/v1/listings", headers=HEADERS, json={}).status_code in (401, 403)


def test_forged_token_is_rejected(client: TestClient) -> None:
    forged = jwt.encode({"sub": "u", "aud": "authenticated", "exp": int(time.time()) + 600}, "wrong-secret-wrong-secret-wrong!", algorithm="HS256")
    headers = {**HEADERS, "Authorization": f"Bearer {forged}"}
    assert client.post("/api/v1/listings", headers=headers, json={}).status_code == 401


class _Table:
    def __init__(self, role: str) -> None:
        self._role = role

    def select(self, *_: Any) -> "_Table":
        return self

    def eq(self, *_: Any) -> "_Table":
        return self

    def single(self) -> "_Table":
        return self

    def execute(self) -> Any:
        return type("Response", (), {"data": {"role": self._role}})()


class _Client:
    def __init__(self, role: str) -> None:
        self._role = role

    def table(self, _: str) -> _Table:
        return _Table(self._role)


def _as_role(monkeypatch: pytest.MonkeyPatch, role: str) -> None:
    monkeypatch.setattr("app.core.security.get_supabase_client", lambda: _Client(role))


def test_wrong_role_is_forbidden(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _as_role(monkeypatch, "buyer")
    response = client.post(
        "/api/v1/listings",
        headers=_token(),
        json={"plot_id": "p", "harvest_date": "2026-10-20", "combine_sms_used": True},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "http_error"


def test_unknown_fields_are_rejected(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _as_role(monkeypatch, "farmer")
    response = client.post("/api/v1/offers/o1/action", headers=_token(), json={"action": "accept", "extra": 1})
    assert response.status_code == 422
