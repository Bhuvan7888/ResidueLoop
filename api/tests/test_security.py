from fastapi.testclient import TestClient

from app.main import MAX_BODY_SIZE, RATE_LIMIT_REQUESTS, app, request_counts

HEADERS = {"host": "localhost"}


def test_oversized_body_is_rejected() -> None:
    response = TestClient(app).post(
        "/api/v1/listings", headers={**HEADERS, "content-length": str(MAX_BODY_SIZE + 1)}, content=b"{}"
    )
    assert response.status_code == 413


def test_security_headers_are_present() -> None:
    response = TestClient(app).get("/api/v1/health", headers=HEADERS)
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "max-age=31536000" in response.headers["strict-transport-security"]


def test_unknown_host_is_rejected() -> None:
    assert TestClient(app).get("/api/v1/health", headers={"host": "evil.example"}).status_code == 400


def test_rate_limit_returns_429() -> None:
    request_counts.clear()
    client = TestClient(app)
    codes = [client.get("/api/v1/health", headers=HEADERS).status_code for _ in range(RATE_LIMIT_REQUESTS + 1)]
    request_counts.clear()
    assert codes[-1] == 429
