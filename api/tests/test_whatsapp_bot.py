import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.services.whatsapp_service import process_inbound_message, ACTIVE_SESSIONS

client = TestClient(app)


def test_meta_webhook_verification_handshake():
    response = client.get(
        "/api/v1/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "residueloop-0cb6fc51a8d5",
            "hub.challenge": "1158201444",
        },
    )
    assert response.status_code == 200
    assert response.text == "1158201444"


def test_meta_webhook_verification_alias_handshake():
    response = client.get(
        "/api/v1/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "residueloop-0cb6fc51a8d5",
            "hub.challenge": "999888777",
        },
    )
    assert response.status_code == 200
    assert response.text == "999888777"


@pytest.mark.asyncio
@patch("app.services.whatsapp_service.send_whatsapp_message")
@patch("app.services.whatsapp_service.get_supabase_client")
async def test_farmer_questionnaire_full_flow(mock_client_factory: MagicMock, mock_send: MagicMock):
    db = MagicMock()
    mock_client_factory.return_value = db
    # Mock existing farmer
    db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "farmer-uuid", "role": "farmer", "name": "Gurpreet"}
    ]
    db.table.return_value.insert.return_value.execute.return_value.data = [{"id": "list-123"}]

    phone = "+919876543210"
    ACTIVE_SESSIONS.pop(phone, None)

    # 1. Farmer sends "Hi"
    await process_inbound_message(phone, "Hi")
    assert phone in ACTIVE_SESSIONS
    assert ACTIVE_SESSIONS[phone]["step"] == "ask_acres"
    mock_send.assert_awaited()
    sent_text_1 = mock_send.call_args[0][1]
    assert "ਸਵਾਲ 1/5" in sent_text_1

    # 2. Farmer replies "5" acres
    await process_inbound_message(phone, "5")
    assert ACTIVE_SESSIONS[phone]["step"] == "ask_harvest_date"
    assert ACTIVE_SESSIONS[phone]["acres"] == 5.0
    sent_text_2 = mock_send.call_args[0][1]
    assert "ਸਵਾਲ 2/5" in sent_text_2

    # 3. Farmer selects harvest option "2" (1 week)
    await process_inbound_message(phone, "2")
    assert ACTIVE_SESSIONS[phone]["step"] == "ask_quality"
    sent_text_3 = mock_send.call_args[0][1]
    assert "ਸਵਾਲ 3/5" in sent_text_3

    # 4. Farmer selects Grade A+ Feed "1"
    await process_inbound_message(phone, "1")
    assert ACTIVE_SESSIONS[phone]["step"] == "ask_purpose"
    assert ACTIVE_SESSIONS[phone]["quality_grade"] == "grade_a_plus"
    sent_text_4 = mock_send.call_args[0][1]
    assert "ਸਵਾਲ 4/5" in sent_text_4

    # 5. Farmer selects Cattle Feed "1"
    await process_inbound_message(phone, "1")
    assert ACTIVE_SESSIONS[phone]["step"] == "ask_form"
    assert ACTIVE_SESSIONS[phone]["intended_purposes"] == ["cattle_feed"]
    sent_text_5 = mock_send.call_args[0][1]
    assert "ਸਵਾਲ 5/5" in sent_text_5

    # 6. Farmer selects Delivered Bales "2" -> Finalizes listing!
    with patch("app.services.matching_service.match_listing") as mock_match:
        await process_inbound_message(phone, "2")
        mock_match.assert_awaited_once()

    assert phone not in ACTIVE_SESSIONS
    sent_final = mock_send.call_args[0][1]
    assert "ਮੁਬਾਰਕਾਂ" in sent_final
    assert "6,200" in sent_final  # Feed grade benchmark rate
