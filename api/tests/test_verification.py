import pytest
from unittest.mock import patch, MagicMock
from collections.abc import Generator
from app.services.verification_service import run_plot_verification

import os

@pytest.fixture(autouse=True)
def mock_env() -> Generator[None, None, None]:
    with patch.dict(os.environ, {
        "SUPABASE_URL": "http://mock",
        "SUPABASE_SERVICE_ROLE_KEY": "mock",
        "SUPABASE_JWT_SECRET": "mock",
        "DATABASE_URL": "postgresql://mock",
        "NASA_FIRMS_MAP_KEY": "mock",
        "CDSE_CLIENT_ID": "mock",
        "CDSE_CLIENT_SECRET": "mock",
    }):
        yield

@pytest.mark.asyncio
@patch("app.services.verification_service.get_supabase_client")
@patch("app.integrations.firms.FirmsClient.get_fire_hits")
@patch("app.integrations.sentinel.SentinelClient.get_nbr_change")
async def test_run_plot_verification_fire_detected(
    mock_get_nbr: MagicMock, mock_get_firms: MagicMock, mock_get_supabase: MagicMock
) -> None:
    mock_client = MagicMock()
    mock_get_supabase.return_value = mock_client
    
    # Fire detected setup
    mock_get_firms.return_value = 3
    mock_get_nbr.return_value = 0.15
    
    mock_client.table().select().eq().single().execute().data = {
        "plot_id": "plot-1",
        "harvest_date": "2025-10-01",
        "plots": {"radius_m": 50, "centre": {"type": "Point", "coordinates": [75.0, 30.0]}}
    }
    
    await run_plot_verification("listing-1")
    
    mock_client.table().insert.assert_called_once()
    insert_args = mock_client.table().insert.call_args[0][0]
    assert insert_args["verdict"] == "fire_detected"

@pytest.mark.asyncio
@patch("app.services.verification_service.get_supabase_client")
@patch("app.integrations.firms.FirmsClient.get_fire_hits")
@patch("app.integrations.sentinel.SentinelClient.get_nbr_change")
async def test_run_plot_verification_verified(
    mock_get_nbr: MagicMock, mock_get_firms: MagicMock, mock_get_supabase: MagicMock
) -> None:
    mock_client = MagicMock()
    mock_get_supabase.return_value = mock_client
    
    # Verified setup
    mock_get_firms.return_value = 0
    mock_get_nbr.return_value = 0.05
    
    mock_client.table().select().eq().single().execute().data = {
        "plot_id": "plot-1",
        "harvest_date": "2025-10-01",
        "plots": {"radius_m": 50, "centre": {"type": "Point", "coordinates": [75.0, 31.0]}}
    }
    
    await run_plot_verification("listing-1")
    
    mock_client.table().insert.assert_called_once()
    insert_args = mock_client.table().insert.call_args[0][0]
    assert insert_args["verdict"] == "verified"

@pytest.mark.asyncio
@patch("app.services.verification_service.get_supabase_client")
@patch("app.integrations.firms.FirmsClient.get_fire_hits")
@patch("app.integrations.sentinel.SentinelClient.get_nbr_change")
async def test_run_plot_verification_inconclusive(
    mock_get_nbr: MagicMock, mock_get_firms: MagicMock, mock_get_supabase: MagicMock
) -> None:
    mock_client = MagicMock()
    mock_get_supabase.return_value = mock_client
    
    # Inconclusive setup
    mock_get_firms.return_value = 0
    mock_get_nbr.return_value = None
    
    mock_client.table().select().eq().single().execute().data = {
        "plot_id": "plot-1",
        "harvest_date": "2025-10-01",
        "plots": {"radius_m": 50, "centre": {"type": "Point", "coordinates": [75.0, 32.0]}}
    }
    
    await run_plot_verification("listing-1")
    
    mock_client.table().insert.assert_called_once()
    insert_args = mock_client.table().insert.call_args[0][0]
    assert insert_args["verdict"] == "inconclusive"
