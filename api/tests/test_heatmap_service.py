from unittest.mock import MagicMock, patch
import pytest

from app.services.heatmap_service import get_village_heatmap
from app.services.listing_service import get_all_listings


@patch("app.services.heatmap_service.get_supabase_client")
def test_get_village_heatmap_aggregates_demand_and_supply(mock_client_factory: MagicMock) -> None:
    client = MagicMock()
    mock_client_factory.return_value = client

    # Mock villages
    villages_table = MagicMock()
    villages_table.select.return_value.execute.return_value.data = [
        {
            "id": "v-1",
            "name": "Ajitwal",
            "district": "Moga",
            "geometry": {"coordinates": [75.21, 30.81]},
        },
        {
            "id": "v-2",
            "name": "Dharamkot",
            "district": "Moga",
            "geometry": {"coordinates": [75.24, 30.94]},
        },
    ]

    # Mock demand_posts
    demand_table = MagicMock()
    demand_table.select.return_value.eq.return_value.execute.return_value.data = [
        {
            "tonnes_needed": 200,
            "price_per_tonne": 1500,
            "location": {"coordinates": [75.21, 30.81]},
        }
    ]

    # Mock listings
    listings_table = MagicMock()
    listings_table.select.return_value.neq.return_value.execute.return_value.data = [
        {
            "id": "l-1",
            "est_tonnes": 50,
            "status": "open",
            "plots": {"village_id": "v-1", "acres": 20},
            "offers": [{"price_per_tonne": 1500}],
        }
    ]

    def table_router(name: str):
        if name == "villages":
            return villages_table
        if name == "demand_posts":
            return demand_table
        if name == "listings":
            return listings_table
        return MagicMock()

    client.table.side_effect = table_router

    result = get_village_heatmap()
    assert len(result) == 2

    ajitwal = next(z for z in result if z["name"] == "Ajitwal")
    assert ajitwal["demand_tonnes"] == 200.0
    assert ajitwal["supply_tonnes"] == 50.0
    assert ajitwal["unfilled_tonnes"] == 150.0
    assert ajitwal["is_unfilled_zone"] is True
    assert ajitwal["avg_price"] == 1500.0


@pytest.mark.asyncio
@patch("app.services.listing_service.get_supabase_client")
async def test_get_all_listings_enriches_procurement_advice(mock_client_factory: MagicMock) -> None:
    client = MagicMock()
    mock_client_factory.return_value = client

    # Mock listings query
    listings_query = MagicMock()
    listings_query.order.return_value.execute.return_value.data = [
        {
            "id": "l-sms",
            "farmer_id": "f-1",
            "plot_id": "p-1",
            "harvest_date": "2026-10-20",
            "combine_sms_used": True,
            "est_tonnes": 30.0,
            "status": "matched",
            "created_at": "2026-10-11T10:00:00Z",
            "source": "web",
            "plots": {"id": "p-1", "acres": 12.0, "village_id": "v-1", "villages": {"name": "Ajitwal", "district": "Moga"}},
            "offers": [{"id": "o-1", "price_per_tonne": 1600.0, "status": "pending", "balers": {"name": "Baler Co"}}],
        },
        {
            "id": "l-no-sms",
            "farmer_id": "f-2",
            "plot_id": "p-2",
            "harvest_date": "2026-10-22",
            "combine_sms_used": False,
            "est_tonnes": 25.0,
            "status": "open",
            "created_at": "2026-10-11T10:00:00Z",
            "source": "web",
            "plots": {"id": "p-2", "acres": 10.0, "village_id": "v-1", "villages": {"name": "Ajitwal", "district": "Moga"}},
            "offers": [],
        },
    ]

    client.table.return_value.select.return_value = listings_query
    # Profiles mock
    client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"name": "Gurpreet Singh", "phone": "+919876543210"}
    ]

    results = await get_all_listings()
    assert len(results) == 2

    # SMS equipped item should be recommended to buy
    sms_item = next(item for item in results if item["id"] == "l-sms")
    assert sms_item["procurement_advice"]["decision"] == "buy"
    assert sms_item["procurement_advice"]["badge"] == "Recommended to Buy"
    assert sms_item["price_per_tonne"] == 1600.0
    assert sms_item["total_price"] == 48000.0

    # Non-SMS item should be caution
    no_sms_item = next(item for item in results if item["id"] == "l-no-sms")
    assert no_sms_item["procurement_advice"]["decision"] == "caution"
    assert no_sms_item["procurement_advice"]["badge"] == "Buy with Caution"
    assert no_sms_item["price_per_tonne"] == 1500.0
