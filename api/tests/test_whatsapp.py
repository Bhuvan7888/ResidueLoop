import hashlib
import hmac
import json
from datetime import date
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.enums import PaymentStatus
from app.integrations import llm, whatsapp
from app.integrations.llm import Intent, ParsedMessage
from app.main import app
from app.services import conversation_service
from app.services.whatsapp_templates import render

SECRET = "test-meta-app-secret"
VERIFY_TOKEN = "test-verify-token"
HOST = {"host": "hooks.example.test"}
URL = "/api/v1/webhooks/whatsapp"


def _sign(raw: bytes) -> str:
    return "sha256=" + hmac.new(SECRET.encode(), raw, hashlib.sha256).hexdigest()


def _payload(text: str = "hello", wa_id: str = "919999999990", message_id: str = "wamid.1") -> dict[str, Any]:
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "waba",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "contacts": [{"wa_id": wa_id}],
                            "messages": [{"from": wa_id, "id": message_id, "type": "text", "text": {"body": text}}],
                        },
                    }
                ],
            }
        ],
    }


# --- signature, handshake and message parsing ----------------------------------------------------


def test_valid_signature_is_accepted_and_forged_or_changed_is_rejected() -> None:
    raw = b'{"a": 1}'
    assert whatsapp.verify_signature(raw, _sign(raw), SECRET)
    assert not whatsapp.verify_signature(raw, "sha256=forged", SECRET)
    assert not whatsapp.verify_signature(b'{"a": 2}', _sign(raw), SECRET)


def test_missing_secret_or_signature_never_passes() -> None:
    raw = b"{}"
    assert not whatsapp.verify_signature(raw, _sign(raw), "")
    assert not whatsapp.verify_signature(raw, "", SECRET)
    assert not whatsapp.verify_signature(raw, _sign(raw).removeprefix("sha256="), SECRET)


def test_handshake_needs_the_matching_verify_token() -> None:
    assert whatsapp.verify_token_matches("subscribe", VERIFY_TOKEN, VERIFY_TOKEN)
    assert not whatsapp.verify_token_matches("subscribe", "wrong", VERIFY_TOKEN)
    assert not whatsapp.verify_token_matches("subscribe", "", "")
    assert not whatsapp.verify_token_matches("unsubscribe", VERIFY_TOKEN, VERIFY_TOKEN)


def test_only_indian_numbers_are_accepted_and_masked_for_storage() -> None:
    assert whatsapp.phone_from_wa_id("919999999990") == "+919999999990"
    assert whatsapp.phone_from_wa_id("14155550100") is None
    assert whatsapp.mask_phone("+919999999990") == "+91******9990"


def test_only_text_messages_from_indian_numbers_are_extracted() -> None:
    assert whatsapp.text_messages(_payload("4 acres")) == [
        whatsapp.IncomingMessage(id="wamid.1", phone="+919999999990", text="4 acres")
    ]
    assert whatsapp.text_messages(_payload(wa_id="14155550100")) == []
    status_only = {"entry": [{"changes": [{"value": {"statuses": [{"id": "x", "status": "delivered"}]}}]}]}
    assert whatsapp.text_messages(status_only) == []
    image = _payload()
    image["entry"][0]["changes"][0]["value"]["messages"][0]["type"] = "image"
    assert whatsapp.text_messages(image) == []
    assert whatsapp.text_messages({}) == [] and whatsapp.text_messages({"entry": [{"changes": None}]}) == []


def test_failed_delivery_reports_are_extracted_with_their_error() -> None:
    report = {"entry": [{"changes": [{"value": {"statuses": [{"id": "wamid.9", "status": "failed", "errors": [{"code": 131047, "title": "Re-engagement message"}]},{"id": "wamid.8", "status": "delivered"}]}}]}]}
    assert whatsapp.failed_statuses(report) == [{"id": "wamid.9", "errors": [{"code": 131047, "title": "Re-engagement message"}]}]
    assert whatsapp.failed_statuses({}) == []


def test_webhook_handshake_returns_the_challenge_only_for_the_right_token() -> None:
    client = TestClient(app)
    ok = client.get(
        URL, params={"hub.mode": "subscribe", "hub.verify_token": VERIFY_TOKEN, "hub.challenge": "12345"}, headers=HOST
    )
    assert ok.status_code == 200 and ok.text == "12345"
    bad = client.get(
        URL, params={"hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "12345"}, headers=HOST
    )
    assert bad.status_code == 403


def test_webhook_rejects_forged_signature_and_queues_a_valid_message(monkeypatch: pytest.MonkeyPatch) -> None:
    handled: list[tuple[str, str, str]] = []

    async def fake_handle(message_id: str, phone: str, text: str) -> None:
        handled.append((message_id, phone, text))

    monkeypatch.setattr("app.routers.v1.webhooks.conversation_service.handle_inbound", fake_handle)
    client = TestClient(app)
    raw = json.dumps(_payload("ਹਾਂ")).encode()

    forged = client.post(URL, content=raw, headers={**HOST, "X-Hub-Signature-256": "sha256=bad"})
    assert forged.status_code == 403 and handled == []
    unsigned = client.post(URL, content=raw, headers=HOST)
    assert unsigned.status_code == 403 and handled == []

    ok = client.post(URL, content=raw, headers={**HOST, "X-Hub-Signature-256": _sign(raw)})
    assert ok.status_code == 200
    assert handled == [("wamid.1", "+919999999990", "ਹਾਂ")]


def test_webhook_acknowledges_status_updates_without_replying(monkeypatch: pytest.MonkeyPatch) -> None:
    handled: list[Any] = []
    monkeypatch.setattr("app.routers.v1.webhooks.conversation_service.handle_inbound", lambda *a: handled.append(a))
    raw = json.dumps({"entry": [{"changes": [{"value": {"statuses": [{"id": "x", "status": "read"}]}}]}]}).encode()
    response = TestClient(app).post(URL, content=raw, headers={**HOST, "X-Hub-Signature-256": _sign(raw)})
    assert response.status_code == 200 and handled == []


def test_webhook_rejects_a_signed_body_that_is_not_json() -> None:
    raw = b"not json"
    response = TestClient(app).post(URL, content=raw, headers={**HOST, "X-Hub-Signature-256": _sign(raw)})
    assert response.status_code == 400


# --- parser ------------------------------------------------------------------------------------


def test_parser_schema_rejects_unknown_intents_and_extra_fields() -> None:
    with pytest.raises(ValidationError):
        ParsedMessage.model_validate({"intent": "delete_everything"})
    with pytest.raises(ValidationError):
        ParsedMessage.model_validate({"intent": "accept_offer", "offer_id": "someone-elses"})
    with pytest.raises(ValidationError):
        ParsedMessage.model_validate({"intent": "create_listing", "user_id": "victim"})


def test_mock_parser_understands_the_demo_phrases() -> None:
    assert llm._fake_parse("4 acres harvest 2026-10-20") == ParsedMessage(
        intent=Intent.CREATE_LISTING, acres=4.0, harvest_date=date(2026, 10, 20)
    )
    assert llm._fake_parse("NOT RECEIVED").payment_status == PaymentStatus.NOT_RECEIVED
    assert llm._fake_parse("RECEIVED").payment_status == PaymentStatus.RECEIVED
    assert llm._fake_parse("ਹਾਂ").intent == Intent.ACCEPT_OFFER
    assert llm._fake_parse("what is the weather").intent == Intent.UNKNOWN


@pytest.mark.parametrize(
    "model_text",
    ["not json at all", '{"intent": "drop_tables"}', '{"intent": "accept_offer", "user_id": "x"}'],
)
async def test_bad_model_output_becomes_unknown(monkeypatch: pytest.MonkeyPatch, model_text: str) -> None:
    class Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, Any]:
            return {"candidates": [{"content": {"parts": [{"text": model_text}]}}]}

    async def fake_post(*_: Any, **__: Any) -> Response:
        return Response()

    monkeypatch.setattr(
        "app.integrations.llm.get_settings",
        lambda: SimpleNamespace(mock_llm_parser=False, llm_api_key="k", llm_model="m"),
    )
    monkeypatch.setattr("app.integrations.llm.SharedHttpClient.post", fake_post)
    assert (await llm.parse_message("anything")).intent == Intent.UNKNOWN


# --- conversation flow -------------------------------------------------------------------------


class Recorder:
    """Captures stored messages and sent replies, with the database layer replaced."""

    def __init__(self, monkeypatch: pytest.MonkeyPatch, profile: dict[str, Any] | None, fresh: bool = True) -> None:
        self.stored: list[dict[str, Any]] = []
        self.sent: list[str] = []
        c = "app.services.conversation_service"
        monkeypatch.setattr(f"{c}.profiles.get_by_phone", lambda phone: profile)
        monkeypatch.setattr(f"{c}.messages.insert_message", lambda fields: self._insert(fields, fresh))
        monkeypatch.setattr(f"{c}.messages.update_message", lambda message_id, fields: None)

        async def send(phone: str, body: str) -> str:
            self.sent.append(body)
            return "wamid.out"

        monkeypatch.setattr(f"{c}.whatsapp.send_text", send)

    def _insert(self, fields: dict[str, Any], fresh: bool) -> bool:
        if fresh:
            self.stored.append(fields)
        return fresh


FARMER = {"id": "farmer-1", "role": "farmer", "language": "pa"}


async def test_unknown_number_gets_registration_message(monkeypatch: pytest.MonkeyPatch) -> None:
    rec = Recorder(monkeypatch, None)
    await conversation_service.handle_inbound("wamid.1", "+919999999991", "hello")
    assert rec.sent == [render("unknown_number")]
    assert [m["direction"] for m in rec.stored] == ["in", "out"]
    assert rec.stored[0]["profile_id"] is None and rec.stored[1]["provider_message_id"] == "wamid.out"


async def test_replayed_message_is_ignored(monkeypatch: pytest.MonkeyPatch) -> None:
    rec = Recorder(monkeypatch, FARMER, fresh=False)
    await conversation_service.handle_inbound("wamid.1", "+919999999990", "RECEIVED")
    assert rec.sent == [] and rec.stored == []


async def test_non_farmer_is_told_the_service_is_for_farmers(monkeypatch: pytest.MonkeyPatch) -> None:
    rec = Recorder(monkeypatch, {"id": "b1", "role": "buyer", "language": "en"})
    await conversation_service.handle_inbound("wamid.1", "+919999999992", "RECEIVED")
    assert rec.sent == [render("farmers_only")]


async def test_overlong_message_is_not_parsed(monkeypatch: pytest.MonkeyPatch) -> None:
    rec = Recorder(monkeypatch, FARMER)

    async def explode(_: str) -> ParsedMessage:
        raise AssertionError("must not parse an over-long message")

    monkeypatch.setattr("app.services.conversation_service.llm.parse_message", explode)
    await conversation_service.handle_inbound("wamid.1", "+919999999990", "x" * 600)
    assert rec.sent == [render("too_long")]


async def test_unparseable_message_asks_for_clarification_and_creates_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    rec = Recorder(monkeypatch, FARMER)
    created: list[Any] = []
    monkeypatch.setattr("app.services.conversation_service.listing_service.create_listing", lambda *a, **k: created.append(a))
    await conversation_service.handle_inbound("wamid.1", "+919999999990", "random gossip")
    assert rec.sent == [render("clarify")] and created == []


async def test_a_failed_send_is_logged_and_the_reply_is_still_stored(monkeypatch: pytest.MonkeyPatch) -> None:
    rec = Recorder(monkeypatch, None)

    async def broken(phone: str, body: str) -> str:
        raise RuntimeError("meta is down")

    monkeypatch.setattr("app.services.conversation_service.whatsapp.send_text", broken)
    await conversation_service.handle_inbound("wamid.1", "+919999999991", "hello")
    assert rec.stored[1]["direction"] == "out" and rec.stored[1]["provider_message_id"] is None


def test_listing_by_whatsapp_uses_the_web_service_with_whatsapp_source(monkeypatch: pytest.MonkeyPatch) -> None:
    c = "app.services.conversation_service"
    calls: list[dict[str, Any]] = []

    def create(*args: Any, **kwargs: Any) -> dict[str, Any]:
        calls.append({"args": args, **kwargs})
        return {"id": "l1", "est_tonnes": 10.0, "offer_id": "o1"}

    monkeypatch.setattr(f"{c}.plots.list_plots", lambda fid: [{"id": "p1", "acres": 4.0}])
    monkeypatch.setattr(f"{c}.listing_service.create_listing", create)
    monkeypatch.setattr(
        f"{c}.offers.get_offer", lambda oid: {"id": "o1", "price_per_tonne": 1800, "pickup_start": "2026-10-13T00:00:00+00:00"}
    )
    reply = conversation_service.run_intent(
        "farmer-1", ParsedMessage(intent=Intent.CREATE_LISTING, acres=4.0, harvest_date=date(2026, 10, 20))
    )
    assert calls[0]["source"] == "whatsapp" and calls[0]["args"][0] == "farmer-1"
    assert reply.key == "listing_with_offer" and reply.values["price"] == "1800"


def test_listing_without_acres_or_date_asks_for_them() -> None:
    assert conversation_service.run_intent("f", ParsedMessage(intent=Intent.CREATE_LISTING)).key == "need_acres"
    assert conversation_service.run_intent("f", ParsedMessage(intent=Intent.CREATE_LISTING, acres=4)).key == "need_date"


def test_pool_answer_comes_from_database_values(monkeypatch: pytest.MonkeyPatch) -> None:
    c = "app.services.conversation_service"
    monkeypatch.setattr(f"{c}.listings.list_farmer_listings", lambda fid: [{"id": "l1", "pool_id": "pool1"}])
    monkeypatch.setattr(
        f"{c}.pools.get_pool",
        lambda pid: {"id": pid, "status": "forming", "current_tonnes": 6.5, "target_tonnes": 8, "pickup_date": None},
    )
    reply = conversation_service.run_intent("farmer-1", ParsedMessage(intent=Intent.ASK_POOL_PROGRESS))
    assert render(reply.key, **reply.values) == render("pool_progress", current="6.5", target="8", needed="1.5")


def test_setting_payment_status_applies_to_the_callers_own_pickup(monkeypatch: pytest.MonkeyPatch) -> None:
    c = "app.services.conversation_service"
    applied: list[tuple[str, str, PaymentStatus]] = []
    monkeypatch.setattr(f"{c}.listings.list_farmer_listings", lambda fid: [{"id": "l1", "pool_id": None}])
    monkeypatch.setattr(f"{c}.pickups.latest_for_listings", lambda ids: {"id": "k1"})
    monkeypatch.setattr(f"{c}.pickup_service.set_payment_status", lambda *args: applied.append(args))
    reply = conversation_service.run_intent(
        "farmer-1", ParsedMessage(intent=Intent.SET_PAYMENT_STATUS, payment_status=PaymentStatus.RECEIVED)
    )
    assert applied == [("farmer-1", "k1", PaymentStatus.RECEIVED)] and reply.key == "payment_updated"


def test_support_requests_say_they_are_not_available_yet() -> None:
    assert conversation_service.run_intent("f", ParsedMessage(intent=Intent.REQUEST_SUPPORT)).key == "support_unavailable"
