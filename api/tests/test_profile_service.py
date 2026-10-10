from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.services.profile_service import create_profile


@patch("app.services.profile_service.get_supabase_client")
def test_create_profile_uses_authenticated_phone_and_immutable_role(mock_client_factory: MagicMock) -> None:
    client = MagicMock()
    table = MagicMock()
    client.table.return_value = table
    table.select().eq().limit().execute().data = []
    insert_result = MagicMock()
    table.insert.return_value = insert_result
    insert_result.execute.return_value.data = [
        {"id": "user-id", "phone": "+919999999999", "role": "farmer"}
    ]
    mock_client_factory.return_value = client

    profile = create_profile("user-id", "+919999999999", "farmer")

    assert profile["role"] == "farmer"
    table.insert.assert_called_once_with(
        {"id": "user-id", "phone": "+919999999999", "role": "farmer"}
    )


@patch("app.services.profile_service.get_supabase_client")
def test_create_profile_rejects_a_second_role_selection(mock_client_factory: MagicMock) -> None:
    client = MagicMock()
    table = MagicMock()
    client.table.return_value = table
    table.select().eq().limit().execute().data = [{"id": "user-id"}]
    mock_client_factory.return_value = client

    with pytest.raises(HTTPException, match="already exists") as error:
        create_profile("user-id", "+919999999999", "buyer")

    assert error.value.status_code == 409
    table.insert.assert_not_called()


def test_profile_creation_requires_a_bearer_token() -> None:
    response = TestClient(app, base_url="http://localhost").post(
        "/api/v1/profiles", json={"role": "farmer"}
    )

    assert response.status_code == 401
