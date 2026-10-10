from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.schemas.market import BuyerProfileCreate, ListingCreate
from app.services.buyer_service import create_buyer_profile, update_demand_post
from app.services.listing_service import create_listing


@pytest.mark.asyncio
@patch("app.services.buyer_service.get_supabase_client")
async def test_buyer_profile_persists_a_postgis_point(mock_client_factory: MagicMock) -> None:
    client = MagicMock()
    mock_client_factory.return_value = client

    await create_buyer_profile(
        "buyer-id",
        BuyerProfileCreate(
            org_name="Moga Biomass", type="biomass", lat=30.82, lng=75.17,
            capacity=200, price_per_tonne=1800, min_load_tonnes=8,
        ),
    )

    client.table.return_value.upsert.assert_called_once_with(
        {
            "profile_id": "buyer-id", "org_name": "Moga Biomass", "type": "biomass",
            "location": "SRID=4326;POINT(75.17 30.82)", "capacity": 200,
            "price_per_tonne": 1800, "min_load_tonnes": 8,
        }
    )


@pytest.mark.asyncio
@patch("app.services.buyer_service.get_supabase_client")
async def test_demand_update_hides_other_buyers_record(mock_client_factory: MagicMock) -> None:
    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"buyer_id": "another-buyer"}
    ]
    mock_client_factory.return_value = client

    from app.schemas.market import DemandPostUpdate

    with pytest.raises(HTTPException) as error:
        await update_demand_post("buyer-id", "demand-id", DemandPostUpdate(status="closed"))

    assert error.value.status_code == 404
    client.table.return_value.update.assert_not_called()


@pytest.mark.asyncio
@patch("app.services.listing_service.get_supabase_client")
async def test_unverified_farmer_cannot_create_listing(mock_client_factory: MagicMock) -> None:
    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id_status": "pending"}
    ]
    mock_client_factory.return_value = client

    with pytest.raises(HTTPException) as error:
        await create_listing(
            "farmer-id",
            ListingCreate(plot_id="plot-id", harvest_date=date(2026, 10, 10), combine_sms_used=True, est_tonnes=5),
        )

    assert error.value.status_code == 403


@pytest.mark.asyncio
@patch("app.services.listing_service.get_supabase_client")
@patch("app.services.matching_service.match_listing")
async def test_verified_farmer_persists_listing_for_owned_plot(
    match_listing: MagicMock, mock_client_factory: MagicMock
) -> None:
    client = MagicMock()
    table = client.table.return_value
    table.select.return_value.eq.return_value.execute.return_value.data = [{"id_status": "verified"}]
    table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "plot-id"}]
    table.insert.return_value.execute.return_value.data = [{"id": "listing-id"}]
    mock_client_factory.return_value = client

    listing_id = await create_listing(
        "farmer-id",
        ListingCreate(plot_id="plot-id", harvest_date=date(2026, 10, 10), combine_sms_used=False, est_tonnes=5),
    )

    assert listing_id == "listing-id"
    match_listing.assert_awaited_once_with("farmer-id", "listing-id")
