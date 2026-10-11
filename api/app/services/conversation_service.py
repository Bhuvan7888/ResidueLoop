import logging
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any

from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.enums import ListingSource, PoolStatus
from app.core.errors import DomainError, ForbiddenError
from app.integrations import llm, whatsapp
from app.integrations.llm import Intent, ParsedMessage
from app.repositories import listings, messages, offers, pickups, plots, pools, profiles
from app.services import listing_service, matching_service, pickup_service
from app.services.whatsapp_templates import PAYMENT_STATUS_LABELS, render

logger = logging.getLogger(__name__)

ACRES_TOLERANCE = 0.05
STORED_TEXT_LIMIT = 2000


@dataclass(frozen=True)
class Reply:
    key: str
    values: Mapping[str, object] = field(default_factory=dict)
    record_type: str | None = None
    record_id: str | None = None


def _tonnes(value: object) -> str:
    return f"{float(str(value)):g}"


def _farmer_listing_ids(profile_id: str) -> list[str]:
    return [item["id"] for item in listings.list_farmer_listings(profile_id)]


def _latest_pool(profile_id: str) -> dict[str, Any] | None:
    pooled = [item for item in listings.list_farmer_listings(profile_id) if item["pool_id"]]
    return pools.get_pool(pooled[0]["pool_id"]) if pooled else None


def _create_listing(profile_id: str, parsed: ParsedMessage) -> Reply:
    if parsed.acres is None:
        return Reply("need_acres")
    if parsed.harvest_date is None:
        return Reply("need_date")
    farmer_plots = plots.list_plots(profile_id)
    if not farmer_plots:
        return Reply("no_plot")
    match = next((p for p in farmer_plots if abs(float(p["acres"]) - parsed.acres) <= ACRES_TOLERANCE), None)
    if match is None:
        return Reply("which_plot")

    created = listing_service.create_listing(
        profile_id, match["id"], parsed.harvest_date, False, source=ListingSource.WHATSAPP
    )
    listing_id = str(created["id"])
    tonnes = _tonnes(created["est_tonnes"])
    offer = offers.get_offer(str(created["offer_id"])) if created["offer_id"] else None
    if offer is None:
        return Reply("listing_no_offer", {"tonnes": tonnes}, "listing", listing_id)
    values = {"tonnes": tonnes, "price": _tonnes(offer["price_per_tonne"]), "date": str(offer["pickup_start"])[:10]}
    return Reply("listing_with_offer", values, "offer", offer["id"])


def _accept_offer(profile_id: str, _: ParsedMessage) -> Reply:
    offer = offers.latest_pending_offer(_farmer_listing_ids(profile_id))
    if offer is None:
        return Reply("no_pending_offer")
    result = matching_service.accept_offer(profile_id, offer["id"])
    pool = pools.get_pool(result["pool_id"])
    target = pool["target_tonnes"] if pool else result["current_tonnes"]
    values = {"current": _tonnes(result["current_tonnes"]), "target": _tonnes(target)}
    return Reply("offer_accepted", values, "pool", result["pool_id"])


def _ask_pickup_date(profile_id: str, _: ParsedMessage) -> Reply:
    pool = _latest_pool(profile_id)
    if pool is None:
        return Reply("no_pool")
    if pool["pickup_date"] is None:
        return Reply("pickup_date_pending", record_type="pool", record_id=pool["id"])
    return Reply("pickup_date", {"date": pool["pickup_date"]}, "pool", pool["id"])


def _ask_pool_progress(profile_id: str, _: ParsedMessage) -> Reply:
    pool = _latest_pool(profile_id)
    if pool is None:
        return Reply("no_pool")
    current, target = float(pool["current_tonnes"]), float(pool["target_tonnes"])
    if pool["status"] != PoolStatus.FORMING and pool["pickup_date"]:
        return Reply("pool_full", {"current": _tonnes(current), "date": pool["pickup_date"]}, "pool", pool["id"])
    values = {"current": _tonnes(current), "target": _tonnes(target), "needed": _tonnes(max(0.0, target - current))}
    return Reply("pool_progress", values, "pool", pool["id"])


def _ask_payment_status(profile_id: str, _: ParsedMessage) -> Reply:
    pickup = pickups.latest_for_listings(_farmer_listing_ids(profile_id))
    if pickup is None:
        return Reply("no_pickup")
    if pickup["weighed_tonnes"] is None:
        return Reply("not_weighed", record_type="pickup", record_id=pickup["id"])
    values = {"status": PAYMENT_STATUS_LABELS[pickup["payment_status"]], "amount": _tonnes(pickup["amount_due"])}
    return Reply("payment_status", values, "pickup", pickup["id"])


def _set_payment_status(profile_id: str, parsed: ParsedMessage) -> Reply:
    if parsed.payment_status is None:
        return Reply("need_payment_status")
    pickup = pickups.latest_for_listings(_farmer_listing_ids(profile_id))
    if pickup is None:
        return Reply("no_pickup")
    pickup_service.set_payment_status(profile_id, pickup["id"], parsed.payment_status)
    return Reply("payment_updated", {"status": parsed.payment_status.value}, "pickup", pickup["id"])


def _request_support(profile_id: str, _: ParsedMessage) -> Reply:
    # Support requests need the charity tables, which are deferred. The farmer is pointed to the app.
    return Reply("support_unavailable")


_HANDLERS = {
    Intent.CREATE_LISTING: _create_listing,
    Intent.ACCEPT_OFFER: _accept_offer,
    Intent.ASK_PICKUP_DATE: _ask_pickup_date,
    Intent.ASK_POOL_PROGRESS: _ask_pool_progress,
    Intent.ASK_PAYMENT_STATUS: _ask_payment_status,
    Intent.SET_PAYMENT_STATUS: _set_payment_status,
    Intent.REQUEST_SUPPORT: _request_support,
}


def run_intent(profile_id: str, parsed: ParsedMessage) -> Reply:
    """Run one allowlisted intent for the user the phone number maps to. Content never picks the user."""
    handler = _HANDLERS.get(parsed.intent)
    if handler is None:
        return Reply("clarify")
    try:
        return handler(profile_id, parsed)
    except ForbiddenError:
        return Reply("not_verified")
    except DomainError:
        return Reply("error")
    except Exception:
        logger.exception("whatsapp intent failed: %s", parsed.intent)
        return Reply("error")


def _store(fields: dict[str, Any]) -> bool:
    return messages.insert_message(fields)


async def _send_and_store(profile_id: str | None, phone: str, reply: Reply) -> None:
    body = render(reply.key, **reply.values)
    try:
        provider_id: str | None = await whatsapp.send_text(phone, body)
    except Exception:
        logger.exception("whatsapp send failed")
        provider_id = None
    await run_in_threadpool(
        _store,
        {
            "provider_message_id": provider_id,
            "profile_id": profile_id,
            "phone_masked": whatsapp.mask_phone(phone),
            "direction": "out",
            "raw_text": body,
            "linked_record_type": reply.record_type,
            "linked_record_id": reply.record_id,
        },
    )


async def handle_inbound(message_id: str, phone: str, text: str) -> None:
    profile = await run_in_threadpool(profiles.get_by_phone, phone)
    profile_id = profile["id"] if profile else None
    inbound = {
        "provider_message_id": message_id,
        "profile_id": profile_id,
        "phone_masked": whatsapp.mask_phone(phone),
        "direction": "in",
        "raw_text": text[:STORED_TEXT_LIMIT],
    }
    if not await run_in_threadpool(_store, inbound):
        return  # replay of a message already handled

    if profile is None:
        reply = Reply("unknown_number")
    elif profile["role"] != "farmer":
        reply = Reply("farmers_only")
    elif len(text) > get_settings().whatsapp_max_message_chars:
        reply = Reply("too_long")
    else:
        parsed = await llm.parse_message(text)
        reply = await run_in_threadpool(run_intent, profile["id"], parsed)
        await run_in_threadpool(
            messages.update_message,
            message_id,
            {
                "parsed_json": parsed.model_dump(mode="json"),
                "intent": parsed.intent.value,
                "linked_record_type": reply.record_type,
                "linked_record_id": reply.record_id,
            },
        )
    await _send_and_store(profile_id, phone, reply)
