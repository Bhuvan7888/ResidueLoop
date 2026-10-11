import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, base_url="https://residueloop.in")


def test_get_deals_endpoint_returns_data() -> None:
    with patch("app.routers.v1.offer.get_supabase_client") as mock_get_supabase:
        mock_supabase = MagicMock()
        mock_get_supabase.return_value = mock_supabase

        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
            {
                "id": "offer-123",
                "status": "accepted",
                "price_per_tonne": 1850.0,
                "pickup_start": "2026-10-15",
                "pickup_end": "2026-10-18",
                "buyer_id": "buyer-456",
                "baler_id": "baler-789",
                "listing_id": "listing-101",
                "created_at": "2026-10-11T12:00:00Z",
                "updated_at": "2026-10-11T12:00:00Z",
                "buyers": {"org_name": "Punjab Biomass Power", "type": "biomass"},
                "balers": {"id": "baler-789", "name": "Moga Express Balers"},
                "listings": {
                    "id": "listing-101",
                    "farmer_id": "farmer-789",
                    "est_tonnes": 25.0,
                    "stubble_form": "delivered_bales",
                    "combine_sms_used": True,
                    "harvest_date": "2026-10-14",
                    "plots": {
                        "acres": 10.0,
                        "villages": {"name": "Chuhar Chak", "district": "Moga"},
                    },
                },
            }
        ]

        # Profile mock
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
            {"id": "farmer-789", "name": "Harpreet Singh", "phone": "+919876543210", "role": "farmer"},
            {"id": "buyer-456", "name": "Sunil Verma", "phone": "+919876543211", "role": "buyer"},
        ]

        # Messages mock for preview
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []

        response = client.get("/api/v1/offers/deals")
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) == 1
        assert data[0]["offer_id"] == "offer-123"
        assert data[0]["price_per_tonne"] == 1850.0
        assert data[0]["farmer"]["name"] == "Harpreet Singh"
        assert data[0]["farmer"]["village_name"] == "Chuhar Chak"
        assert data[0]["buyer"]["org_name"] == "Punjab Biomass Power"


def test_get_single_deal_returns_complete_counterparty_details() -> None:
    with patch("app.routers.v1.offer.get_supabase_client") as mock_get_supabase:
        mock_supabase = MagicMock()
        mock_get_supabase.return_value = mock_supabase

        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "id": "offer-abc",
            "status": "accepted",
            "price_per_tonne": 1900.0,
            "pickup_start": "2026-10-20",
            "pickup_end": "2026-10-25",
            "buyer_id": "buyer-999",
            "baler_id": "baler-111",
            "listing_id": "listing-222",
            "buyers": {"org_name": "EcoEnergy Biofuel", "type": "biomass"},
            "balers": {"id": "baler-111", "name": "Ludhiana Balers"},
            "listings": {
                "id": "listing-222",
                "farmer_id": "farmer-333",
                "est_tonnes": 30.0,
                "stubble_form": "delivered_bales",
                "combine_sms_used": True,
                "plots": {
                    "acres": 12.0,
                    "villages": {"name": "Raikot", "district": "Ludhiana"},
                },
            },
        }

        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "farmer-333", "name": "Gurdev Singh", "phone": "+919876543222", "role": "farmer"}
        ]

        response = client.get("/api/v1/offers/offer-abc/deal")
        assert response.status_code == 200
        deal = response.json()["data"]
        assert deal["offer_id"] == "offer-abc"
        assert deal["total_amount"] == 57000.0
        assert deal["farmer"]["name"] == "Gurdev Singh"
        assert deal["buyer"]["org_name"] == "EcoEnergy Biofuel"


def test_get_and_send_messages() -> None:
    with patch("app.routers.v1.offer.get_supabase_client") as mock_get_supabase:
        mock_supabase = MagicMock()
        mock_get_supabase.return_value = mock_supabase

        # Initial message fetch
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
            {
                "id": "msg-1",
                "profile_id": "farmer-333",
                "direction": "inbound",
                "raw_text": "When will tractor arrive?",
                "parsed_intent": "deal_chat:offer-abc",
                "parsed_json": {
                    "offer_id": "offer-abc",
                    "sender_role": "farmer",
                    "sender_name": "Gurdev Singh",
                    "text": "When will tractor arrive?",
                },
                "created_at": "2026-10-11T14:00:00Z",
            }
        ]

        res = client.get("/api/v1/offers/offer-abc/messages")
        assert res.status_code == 200
        msgs = res.json()["data"]
        assert len(msgs) == 1
        assert msgs[0]["text"] == "When will tractor arrive?"
        assert msgs[0]["sender_role"] == "farmer"

        # Post message
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "id": "offer-abc",
            "buyer_id": "00000000-0000-0000-0000-000000000002",
            "listings": {"farmer_id": "00000000-0000-0000-0000-000000000001"},
            "buyers": {"org_name": "EcoEnergy Biofuel"},
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            {
                "id": "00000000-0000-0000-0000-000000000099",
                "created_at": "2026-10-11T14:01:00Z",
            }
        ]

        post_res = client.post(
            "/api/v1/offers/offer-abc/messages",
            json={
                "message": "Tractor team will reach by 10 AM tomorrow.",
                "sender_role": "buyer",
                "sender_name": "EcoEnergy Biofuel",
            },
        )
        assert post_res.status_code == 200
        new_msg = post_res.json()["data"]
        assert new_msg["text"] == "Tractor team will reach by 10 AM tomorrow."
        assert new_msg["sender_role"] == "buyer"
