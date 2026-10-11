from unittest.mock import MagicMock, patch
import pytest
from app.services.charity_service import (
    get_crowdfunding_campaigns,
    create_donation,
)


@pytest.mark.asyncio
@patch("app.services.charity_service.get_supabase_client")
async def test_get_crowdfunding_campaigns(mock_client_factory: MagicMock) -> None:
    client = MagicMock()
    mock_client_factory.return_value = client

    tables = {
        "ngos": MagicMock(),
        "listings": MagicMock(),
        "assistance_requests": MagicMock(),
        "donations": MagicMock(),
        "profiles": MagicMock(),
        "farmers": MagicMock(),
    }
    client.table.side_effect = lambda t: tables.get(t, MagicMock())

    # Mock NGO query
    tables["ngos"].select.return_value.limit.return_value.execute.return_value.data = [
        {"profile_id": "ngo-1", "profiles": {"name": "Punjab Clean Air Trust"}}
    ]

    # Mock open listings query
    tables["listings"].select.return_value.eq.return_value.execute.return_value.data = []

    # Mock assistance requests query
    tables["assistance_requests"].select.return_value.order.return_value.execute.return_value.data = [
        {
            "id": "req-1",
            "farmer_id": "farmer-1",
            "ngo_id": "ngo-1",
            "listing_id": "list-1",
            "amount_requested": 5000.0,
            "purpose": "Emergency stubble clearance",
            "status": "pending",
            "created_at": "2026-10-10T12:00:00Z",
            "ngos": {"profile_id": "ngo-1", "profiles": {"name": "Punjab Clean Air Trust"}},
            "listings": {
                "id": "list-1",
                "est_tonnes": 25.0,
                "status": "open",
                "plots": {
                    "acres": 10.0,
                    "village_id": "v-1",
                    "villages": {"name": "Ajitwal"}
                }
            }
        }
    ]

    # Mock donations sum
    tables["donations"].select.return_value.eq.return_value.execute.return_value.data = [
        {"amount": 1000.0}
    ]

    # Mock farmer profile
    tables["profiles"].select.return_value.eq.return_value.execute.return_value.data = [
        {"name": "Gurpreet Singh"}
    ]

    campaigns = await get_crowdfunding_campaigns()
    assert len(campaigns) == 1
    assert campaigns[0]["id"] == "req-1"
    assert campaigns[0]["farmer_name"] == "Gurpreet Singh"
    assert campaigns[0]["acres"] == 10.0
    assert campaigns[0]["amount_requested"] == 5000.0
    assert campaigns[0]["amount_funded"] == 1000.0


@pytest.mark.asyncio
@patch("app.services.charity_service.get_supabase_client")
async def test_create_donation_notifies_donor_and_farmer(mock_client_factory: MagicMock) -> None:
    client = MagicMock()
    mock_client_factory.return_value = client

    tables = {
        "assistance_requests": MagicMock(),
        "donations": MagicMock(),
        "notifications": MagicMock(),
        "ngos": MagicMock(),
    }
    client.table.side_effect = lambda t: tables.get(t, MagicMock())

    # Mock assistance request lookup
    tables["assistance_requests"].select.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": "req-1",
            "farmer_id": "farmer-1",
            "ngo_id": "ngo-1",
            "amount_requested": 500.0,
            "listing_id": "list-1",
            "listings": {"id": "list-1", "plots": {"acres": 1.0, "village_id": "v-1"}}
        }
    ]

    # Mock donation insert
    tables["donations"].insert.return_value.execute.return_value.data = [
        {"id": "don-1", "amount": 500.0, "donor_id": "donor-1", "ngo_id": "ngo-1"}
    ]

    res = await create_donation(
        donor_id="donor-1",
        ngo_id="ngo-1",
        amount=500.0,
        campaign_id="req-1"
    )

    assert res["id"] == "don-1"
    assert res["amount"] == 500.0


@pytest.mark.asyncio
@patch("app.services.charity_service.get_supabase_client")
async def test_get_ranked_villages(mock_client_factory: MagicMock) -> None:
    from app.services.charity_service import get_ranked_villages
    client = MagicMock()
    mock_client_factory.return_value = client

    tables = {"villages": MagicMock()}
    client.table.side_effect = lambda t: tables.get(t, MagicMock())

    tables["villages"].select.return_value.execute.return_value.data = [
        {"id": "v-1", "name": "Ajitwal", "lat": 30.8, "lon": 75.3},
        {"id": "v-2", "name": "Dharamkot", "lat": 30.9, "lon": 75.2},
    ]

    ranked = await get_ranked_villages(28.7041, 77.1025)
    assert len(ranked) == 2
    assert "influence_score" in ranked[0]
    assert "distance_km" in ranked[0]
    assert ranked[0]["influence_score"] >= ranked[1]["influence_score"]


@pytest.mark.asyncio
@patch("app.services.charity_service.get_supabase_client")
async def test_create_disbursement(mock_client_factory: MagicMock) -> None:
    from app.services.charity_service import create_disbursement
    client = MagicMock()
    mock_client_factory.return_value = client

    tables = {
        "assistance_requests": MagicMock(),
        "disbursements": MagicMock(),
    }
    client.table.side_effect = lambda t: tables.get(t, MagicMock())

    # Mock assistance request approved
    tables["assistance_requests"].select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "ngo_id": "ngo-1",
        "status": "approved",
    }

    # Mock disbursement insert
    tables["disbursements"].insert.return_value.execute.return_value.data = [
        {
            "id": "disb-1",
            "ngo_id": "ngo-1",
            "request_id": "req-1",
            "payee_name": "Majha Balers CHC",
            "payee_type": "baler",
            "amount": 2500.0,
            "note": "Paddy stubble cleanly baled",
        }
    ]

    res = await create_disbursement(
        ngo_id="ngo-1",
        request_id="req-1",
        payee_name="Majha Balers CHC",
        amount=2500.0,
        payee_type="baler",
        note="Paddy stubble cleanly baled",
    )

    assert res["id"] == "disb-1"
    assert res["payee_type"] == "baler"
    assert res["amount"] == 2500.0


@pytest.mark.asyncio
@patch("app.services.charity_service.get_supabase_client")
async def test_create_stripe_checkout_session(mock_client_factory: MagicMock) -> None:
    from app.services.charity_service import create_stripe_checkout_session
    client = MagicMock()
    mock_client_factory.return_value = client

    tables = {"assistance_requests": MagicMock(), "profiles": MagicMock()}
    client.table.side_effect = lambda t: tables.get(t, MagicMock())

    tables["assistance_requests"].select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "req-1", "farmer_id": "farmer-1", "listings": {"plots": {"acres": 8.0, "villages": {"name": "Ajitwal"}}}}
    ]
    tables["profiles"].select.return_value.eq.return_value.execute.return_value.data = [
        {"name": "Harpreet Singh"}
    ]

    res = await create_stripe_checkout_session(
        campaign_id="req-1",
        amount=1000.0,
        currency="inr",
        donor_id="donor-1",
        return_url="http://localhost:5173/app/charity",
    )

    assert "session_id" in res
    assert "checkout_url" in res
    assert "publishable_key" in res


@pytest.mark.asyncio
@patch("app.services.charity_service.send_whatsapp_message")
@patch("app.services.charity_service.get_supabase_client")
async def test_confirm_stripe_donation_dispatches_ngo(
    mock_client_factory: MagicMock, mock_send_wa: MagicMock
) -> None:
    from app.services.charity_service import confirm_stripe_donation
    client = MagicMock()
    mock_client_factory.return_value = client

    tables = {
        "assistance_requests": MagicMock(),
        "donations": MagicMock(),
        "disbursements": MagicMock(),
        "notifications": MagicMock(),
        "profiles": MagicMock(),
        "listings": MagicMock(),
    }
    client.table.side_effect = lambda t: tables.get(t, MagicMock())

    # Mock campaign request
    tables["assistance_requests"].select.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": "req-1",
            "farmer_id": "farmer-1",
            "ngo_id": "ngo-1",
            "listing_id": "list-1",
            "amount_requested": 5000.0,
            "status": "pending",
            "ngos": {"profile_id": "ngo-1", "profiles": {"name": "Punjab Clean Air Action", "phone": "+919999999911"}},
            "listings": {"id": "list-1", "plots": {"acres": 5.0, "village_id": "v-1", "villages": {"name": "Ajitwal"}}},
        }
    ]

    # Mock donation insert
    tables["donations"].insert.return_value.execute.return_value.data = [
        {"id": "don-1", "amount": 5000.0, "donor_id": "donor-1", "ngo_id": "ngo-1"}
    ]

    # Mock donations sum
    tables["donations"].select.return_value.eq.return_value.execute.return_value.data = [
        {"amount": 5000.0}
    ]

    # Mock farmer profile lookup
    tables["profiles"].select.return_value.eq.return_value.execute.return_value.data = [
        {"name": "Harpreet Singh", "phone": "+919876543210"}
    ]

    res = await confirm_stripe_donation(
        campaign_id="req-1",
        amount=5000.0,
        session_id="cs_test_mock_123",
        donor_id="donor-1",
        is_test_dummy=True,
    )

    assert res["status"] == "success"
    assert res["is_fully_funded"] is True
    assert res["ngo_dispatch"] is not None
    assert res["ngo_dispatch"]["mission_status"] == "dispatched"
    assert res["ngo_dispatch"]["ngo_name"] == "Punjab Clean Air Action"

    # Verify farmer WhatsApp alert was triggered
    mock_send_wa.assert_called_once()
    assert "+919876543210" in mock_send_wa.call_args[0]


@pytest.mark.asyncio
@patch("app.services.charity_service.get_supabase_client")
async def test_sync_unsold_listings_to_charity(mock_client_factory: MagicMock) -> None:
    from app.services.charity_service import sync_unsold_listings_to_charity
    client = MagicMock()
    mock_client_factory.return_value = client

    tables = {
        "ngos": MagicMock(),
        "listings": MagicMock(),
        "assistance_requests": MagicMock(),
        "farmers": MagicMock(),
        "notifications": MagicMock(),
    }
    client.table.side_effect = lambda t: tables.get(t, MagicMock())

    tables["ngos"].select.return_value.limit.return_value.execute.return_value.data = [
        {"profile_id": "ngo-1", "profiles": {"name": "Punjab Clean Air Action"}}
    ]

    # Open listing unsold for 3 days
    tables["listings"].select.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": "list-unsold-1",
            "farmer_id": "farmer-1",
            "est_tonnes": 20.0,
            "status": "open",
            "created_at": "2026-10-08T10:00:00Z",
            "plots": {"acres": 8.0, "village_id": "v-1", "villages": {"name": "Ajitwal"}},
        }
    ]

    # Not existing in assistance requests
    tables["assistance_requests"].select.return_value.eq.return_value.execute.return_value.data = []
    tables["assistance_requests"].insert.return_value.execute.return_value.data = [
        {
            "id": "req-synced-1",
            "farmer_id": "farmer-1",
            "ngo_id": "ngo-1",
            "listing_id": "list-unsold-1",
            "amount_requested": 10400.0,
            "status": "pending",
        }
    ]

    res = await sync_unsold_listings_to_charity(days_threshold=2)
    assert len(res) == 1
    assert res[0]["id"] == "req-synced-1"
    assert res[0]["amount_requested"] == 10400.0


@pytest.mark.asyncio
@patch("app.services.charity_service.send_whatsapp_message")
@patch("app.services.charity_service.get_supabase_client")
async def test_dispatch_nearby_ngo_mission(
    mock_client_factory: MagicMock, mock_send_wa: MagicMock
) -> None:
    from app.services.charity_service import dispatch_nearby_ngo_mission
    client = MagicMock()
    mock_client_factory.return_value = client

    tables = {
        "assistance_requests": MagicMock(),
        "listings": MagicMock(),
        "disbursements": MagicMock(),
        "notifications": MagicMock(),
        "profiles": MagicMock(),
    }
    client.table.side_effect = lambda t: tables.get(t, MagicMock())

    tables["assistance_requests"].select.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": "req-disp-1",
            "farmer_id": "farmer-1",
            "ngo_id": "ngo-1",
            "listing_id": "list-1",
            "amount_requested": 6500.0,
            "status": "pending",
            "ngos": {"profile_id": "ngo-1", "profiles": {"name": "Punjab Clean Air Action", "phone": "+919999999911"}},
            "listings": {"id": "list-1", "plots": {"acres": 5.0, "villages": {"name": "Moga"}}},
        }
    ]

    tables["profiles"].select.return_value.eq.return_value.execute.return_value.data = [
        {"name": "Gurmeet Singh", "phone": "+919876500022"}
    ]

    res = await dispatch_nearby_ngo_mission("req-disp-1")
    assert res["status"] == "success"
    assert res["mission_status"] == "dispatched"
    assert res["ngo_name"] == "Punjab Clean Air Action"
    assert "Within 24 Hours" in res["estimated_arrival"]
    mock_send_wa.assert_called_once()


