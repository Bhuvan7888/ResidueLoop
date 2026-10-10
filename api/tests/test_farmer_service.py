import base64
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.schemas.farmer import PlotCreate
from app.services.farmer_service import create_plot, encrypted_content


def test_document_encryption_uses_a_random_nonce() -> None:
    key = base64.urlsafe_b64encode(os.urandom(32)).decode()

    first = encrypted_content(b"document", key)
    second = encrypted_content(b"document", key)

    assert first != second
    assert b"document" not in first


def test_document_encryption_rejects_an_invalid_key() -> None:
    with pytest.raises(HTTPException) as error:
        encrypted_content(b"document", "not-a-key")

    assert error.value.status_code == 503


@pytest.mark.asyncio
@patch("app.services.farmer_service.get_supabase_client")
async def test_create_plot_persists_only_the_owned_farmer_reference(mock_client_factory: MagicMock) -> None:
    client = MagicMock()
    client.table.return_value.insert.return_value.execute.return_value.data = [{"id": "plot-id"}]
    mock_client_factory.return_value = client

    plot_id = await create_plot(
        "farmer-id", PlotCreate(village_id="village-id", lat=30.82, lng=75.17, acres=3)
    )

    assert plot_id == "plot-id"
    client.table.return_value.insert.assert_called_once_with(
        {
            "farmer_id": "farmer-id", "village_id": "village-id",
            "centre": "SRID=4326;POINT(75.17 30.82)", "acres": 3,
        }
    )
