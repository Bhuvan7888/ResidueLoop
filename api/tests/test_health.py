from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok() -> None:
    response = TestClient(app).get("/api/v1/health", headers={"host": "localhost"})
    assert response.status_code == 200
