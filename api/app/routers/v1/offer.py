import datetime
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.core.security import require_role, get_supabase_client
from app.services.matching_service import accept_offer, decline_offer

router = APIRouter(prefix="/offers", tags=["offers"])


class OfferAction(BaseModel):
    action: str  # "accept" or "decline"


class ChatMessagePayload(BaseModel):
    message: str
    sender_id: str | None = None
    sender_role: str | None = "farmer"  # "farmer" or "buyer"
    sender_name: str | None = None


@router.post("/{offer_id}/action")
async def handle_offer_action(
    offer_id: str,
    payload: OfferAction,
    user_id: str = Depends(require_role(["farmer", "buyer"])),
) -> dict[str, Any]:
    if payload.action == "accept":
        await accept_offer(user_id, offer_id)
        # Create an initial system welcome message in the deal chat thread
        try:
            client = get_supabase_client()
            client.table("messages").insert({
                "profile_id": None,
                "phone_number": "+919999999999",
                "direction": "inbound",
                "raw_text": "🎉 Deal accepted! Direct chat enabled between Farmer and Buyer for pickup coordination, tractor arrival, and payment details.",
                "parsed_intent": f"deal_chat:{offer_id}",
                "parsed_json": {
                    "offer_id": offer_id,
                    "sender_id": user_id,
                    "sender_role": "system",
                    "sender_name": "ResidueLoop System",
                    "text": "🎉 Deal accepted! Direct chat enabled between Farmer and Buyer for pickup coordination, tractor arrival, and payment details.",
                },
            }).execute()
        except Exception:
            pass
    elif payload.action == "decline":
        await decline_offer(user_id, offer_id)
    return {"data": "success"}


@router.get("/deals")
async def get_matched_deals(
    user_id: str | None = Query(None),
    role: str | None = Query(None),
    status: str | None = Query("accepted"),
) -> dict[str, Any]:
    """
    Fetch all accepted / matched deals for farmers and buyers with complete counterparty details.
    """
    client = get_supabase_client()
    query = client.table("offers").select(
        "id, status, price_per_tonne, pickup_start, pickup_end, buyer_id, baler_id, listing_id, pool_id, created_at, updated_at, "
        "buyers(org_name, type, profile_id), "
        "balers(id, name), "
        "listings(id, farmer_id, est_tonnes, stubble_form, combine_sms_used, harvest_date, plots(farmer_id, acres, village_id, villages(name, district)))"
    )

    if status and status != "all":
        query = query.eq("status", status)

    res = query.order("updated_at", desc=True).execute()
    raw_offers = res.data or []

    # Filter by user_id and role if provided
    filtered_items: list[tuple[dict[str, Any], dict[str, Any], dict[str, Any], str, str]] = []
    for o in raw_offers:
        l = o.get("listings") or {}
        if isinstance(l, list):
            l = l[0] if l else {}
        plot = l.get("plots") or {}
        if isinstance(plot, list):
            plot = plot[0] if plot else {}

        f_id = str(l.get("farmer_id") or plot.get("farmer_id") or "")
        b_id = str(o.get("buyer_id") or "")

        if user_id:
            if role == "farmer" and f_id != user_id:
                continue
            if role == "buyer" and b_id != user_id:
                continue
            if not role and f_id != user_id and b_id != user_id:
                continue
        filtered_items.append((o, l, plot, f_id, b_id))

    # Collect profile IDs to batch-query profiles for contact names and phones
    profile_ids: set[str] = set()
    for _, _, _, f_id, b_id in filtered_items:
        if f_id:
            profile_ids.add(f_id)
        if b_id:
            profile_ids.add(b_id)

    profiles_map: dict[str, dict[str, Any]] = {}
    if profile_ids:
        try:
            p_res = client.table("profiles").select("id, name, phone, role").in_("id", list(profile_ids)).execute()
            for p in p_res.data or []:
                profiles_map[str(p["id"])] = p
        except Exception:
            pass

    # Format structured deal list
    deals = []
    for o, l, plot, farmer_id, buyer_id in filtered_items:
        farmer_prof = profiles_map.get(farmer_id, {})
        buyer_prof = profiles_map.get(buyer_id, {})

        village = plot.get("villages") or {}
        if isinstance(village, list):
            village = village[0] if village else {}

        est_tonnes = float(l.get("est_tonnes") or 25.0)
        price_per_tonne = float(o.get("price_per_tonne") or 1500.0)
        acres = float(plot.get("acres") or round(est_tonnes / 2.5, 1))

        buyer_data = o.get("buyers") or {}
        if isinstance(buyer_data, list):
            buyer_data = buyer_data[0] if buyer_data else {}
        baler_data = o.get("balers") or {}
        if isinstance(baler_data, list):
            baler_data = baler_data[0] if baler_data else {}

        # Fetch latest message preview if exists
        last_msg_text = None
        last_msg_time = None
        try:
            m_res = client.table("messages").select("raw_text, created_at, parsed_json").eq("parsed_intent", f"deal_chat:{o['id']}").order("created_at", desc=True).limit(1).execute()
            if m_res.data:
                latest_m = m_res.data[0]
                last_msg_text = latest_m.get("raw_text") or (latest_m.get("parsed_json") or {}).get("text")
                last_msg_time = latest_m.get("created_at")
        except Exception:
            pass

        deal = {
            "id": o["id"],
            "offer_id": o["id"],
            "listing_id": o.get("listing_id"),
            "status": o.get("status", "accepted"),
            "price_per_tonne": price_per_tonne,
            "est_tonnes": est_tonnes,
            "total_amount": round(price_per_tonne * est_tonnes, 2),
            "pickup_start": o.get("pickup_start"),
            "pickup_end": o.get("pickup_end"),
            "created_at": o.get("created_at"),
            "last_message": last_msg_text,
            "last_message_at": last_msg_time,
            "farmer": {
                "id": farmer_id,
                "name": farmer_prof.get("name") or "Farmer",
                "phone": farmer_prof.get("phone") or "+919999999999",
                "village_name": village.get("name") or "Village Field",
                "district": village.get("district") or "Punjab",
                "acres": acres,
                "stubble_form": l.get("stubble_form") or ("delivered_bales" if l.get("combine_sms_used") else "farm_gate_loose"),
                "harvest_date": l.get("harvest_date"),
                "combine_sms_used": bool(l.get("combine_sms_used")),
            },
            "buyer": {
                "id": buyer_id,
                "org_name": buyer_data.get("org_name") or buyer_prof.get("name") or "Industrial Biomass Buyer",
                "contact_name": buyer_prof.get("name") or "Procurement Manager",
                "phone": buyer_prof.get("phone") or "+919999999901",
                "type": buyer_data.get("type") or "biomass",
            },
            "baler": {
                "id": o.get("baler_id"),
                "name": baler_data.get("name") or "Assigned Baler Logistics Team",
                "phone": "+919999999902",
            },
        }
        deals.append(deal)

    return {"data": deals}


@router.get("/{offer_id}/deal")
async def get_single_deal(offer_id: str) -> dict[str, Any]:
    """
    Get full counterparty details for a single matched offer/deal.
    """
    client = get_supabase_client()
    res = client.table("offers").select(
        "id, status, price_per_tonne, pickup_start, pickup_end, buyer_id, baler_id, listing_id, pool_id, created_at, updated_at, "
        "buyers(org_name, type, profile_id), "
        "balers(id, name), "
        "listings(id, farmer_id, est_tonnes, stubble_form, combine_sms_used, harvest_date, plots(farmer_id, acres, village_id, villages(name, district)))"
    ).eq("id", offer_id).single().execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Offer not found")

    o = res.data
    l = o.get("listings") or {}
    if isinstance(l, list):
        l = l[0] if l else {}
    plot = l.get("plots") or {}
    if isinstance(plot, list):
        plot = plot[0] if plot else {}

    farmer_id = str(l.get("farmer_id") or plot.get("farmer_id") or "")
    buyer_id = str(o.get("buyer_id") or "")

    # Fetch profiles
    farmer_prof = {}
    buyer_prof = {}
    if farmer_id:
        try:
            f_res = client.table("profiles").select("id, name, phone, role").eq("id", farmer_id).execute()
            if f_res.data:
                farmer_prof = f_res.data[0]
        except Exception:
            pass
    if buyer_id:
        try:
            b_res = client.table("profiles").select("id, name, phone, role").eq("id", buyer_id).execute()
            if b_res.data:
                buyer_prof = b_res.data[0]
        except Exception:
            pass

    village = plot.get("villages") or {}
    if isinstance(village, list):
        village = village[0] if village else {}

    est_tonnes = float(l.get("est_tonnes") or 25.0)
    price_per_tonne = float(o.get("price_per_tonne") or 1500.0)
    acres = float(plot.get("acres") or round(est_tonnes / 2.5, 1))

    buyer_data = o.get("buyers") or {}
    if isinstance(buyer_data, list):
        buyer_data = buyer_data[0] if buyer_data else {}
    baler_data = o.get("balers") or {}
    if isinstance(baler_data, list):
        baler_data = baler_data[0] if baler_data else {}

    deal = {
        "id": o["id"],
        "offer_id": o["id"],
        "listing_id": o.get("listing_id"),
        "status": o.get("status", "accepted"),
        "price_per_tonne": price_per_tonne,
        "est_tonnes": est_tonnes,
        "total_amount": round(price_per_tonne * est_tonnes, 2),
        "pickup_start": o.get("pickup_start"),
        "pickup_end": o.get("pickup_end"),
        "created_at": o.get("created_at"),
        "farmer": {
            "id": farmer_id,
            "name": farmer_prof.get("name") or "Farmer",
            "phone": farmer_prof.get("phone") or "+919999999999",
            "village_name": village.get("name") or "Village Field",
            "district": village.get("district") or "Punjab",
            "acres": acres,
            "stubble_form": l.get("stubble_form") or ("delivered_bales" if l.get("combine_sms_used") else "farm_gate_loose"),
            "harvest_date": l.get("harvest_date"),
            "combine_sms_used": bool(l.get("combine_sms_used")),
        },
        "buyer": {
            "id": buyer_id,
            "org_name": buyer_data.get("org_name") or buyer_prof.get("name") or "Industrial Biomass Buyer",
            "contact_name": buyer_prof.get("name") or "Procurement Manager",
            "phone": buyer_prof.get("phone") or "+919999999901",
            "type": buyer_data.get("type") or "biomass",
        },
        "baler": {
            "id": o.get("baler_id"),
            "name": baler_data.get("name") or "Assigned Baler Logistics Team",
            "phone": "+919999999902",
        },
    }
    return {"data": deal}


@router.get("/{offer_id}/messages")
async def get_offer_messages(offer_id: str) -> dict[str, Any]:
    """
    Get conversation messages for a matched & accepted deal chat thread.
    """
    client = get_supabase_client()
    res = client.table("messages").select("*").eq("parsed_intent", f"deal_chat:{offer_id}").order("created_at", desc=False).execute()
    messages = []
    for m in res.data or []:
        parsed = m.get("parsed_json") or {}
        role = parsed.get("sender_role")
        if not role:
            role = "farmer" if m.get("direction") == "inbound" else "buyer"

        messages.append({
            "id": str(m["id"]),
            "offer_id": offer_id,
            "sender_id": str(m.get("profile_id") or parsed.get("sender_id") or ""),
            "sender_role": role,
            "sender_name": parsed.get("sender_name") or ("Farmer" if role == "farmer" else "Buyer" if role == "buyer" else "ResidueLoop System"),
            "text": parsed.get("text") or m.get("raw_text") or "",
            "created_at": m.get("created_at"),
        })

    # If no messages exist yet, supply a friendly default welcome message
    if not messages:
        messages.append({
            "id": f"sys-welcome-{offer_id}",
            "offer_id": offer_id,
            "sender_id": "",
            "sender_role": "system",
            "sender_name": "ResidueLoop System",
            "text": "🎉 Match Confirmed! Direct coordination chat is active between Farmer and Buyer. Discuss baler arrival, tractor access, and payment details.",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })

    return {"data": messages}


@router.post("/{offer_id}/messages")
async def send_offer_message(
    offer_id: str,
    payload: ChatMessagePayload,
) -> dict[str, Any]:
    """
    Send a direct chat message between matched farmer and buyer.
    """
    cleaned_text = payload.message.strip()
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    client = get_supabase_client()
    offer_res = client.table("offers").select("*, listings(farmer_id, plots(farmer_id)), buyers(org_name, profile_id)").eq("id", offer_id).single().execute()
    if not offer_res.data:
        raise HTTPException(status_code=404, detail="Offer/deal not found")

    offer = offer_res.data
    l = offer.get("listings") or {}
    if isinstance(l, list):
        l = l[0] if l else {}
    plots = l.get("plots") or {}
    if isinstance(plots, list):
        plots = plots[0] if plots else {}

    farmer_id = str(l.get("farmer_id") or plots.get("farmer_id") or "")
    buyer_id = str(offer.get("buyer_id") or "")

    sender_role = payload.sender_role or "farmer"
    if sender_role == "farmer":
        sender_id = payload.sender_id or farmer_id
        recipient_id = buyer_id
        default_sender_name = "Farmer"
    else:
        sender_id = payload.sender_id or buyer_id
        recipient_id = farmer_id
        buyers_info = offer.get("buyers") or {}
        if isinstance(buyers_info, list):
            buyers_info = buyers_info[0] if buyers_info else {}
        default_sender_name = buyers_info.get("org_name") or "Industrial Biomass Buyer"

    sender_name = payload.sender_name or default_sender_name

    # Determine sender phone & name
    sender_phone = "+919999999999"
    if sender_id:
        try:
            p_res = client.table("profiles").select("phone, name").eq("id", sender_id).execute()
            if p_res.data and p_res.data[0].get("phone"):
                sender_phone = p_res.data[0]["phone"]
                if not payload.sender_name and p_res.data[0].get("name"):
                    sender_name = p_res.data[0]["name"]
        except Exception:
            pass

    # Ensure profile_id for DB foreign key is valid UUID or None
    profile_fk = None
    if sender_id:
        try:
            profile_fk = str(uuid.UUID(str(sender_id)))
        except Exception:
            profile_fk = None

    direction = "inbound" if sender_role == "farmer" else "outbound"

    msg_insert = client.table("messages").insert({
        "profile_id": profile_fk,
        "phone_number": sender_phone,
        "direction": direction,
        "raw_text": cleaned_text,
        "parsed_intent": f"deal_chat:{offer_id}",
        "parsed_json": {
            "offer_id": offer_id,
            "sender_id": str(sender_id) if sender_id else "",
            "sender_role": sender_role,
            "sender_name": sender_name,
            "text": cleaned_text,
        },
    }).execute()

    # Send notification alert to recipient
    if recipient_id:
        try:
            client.table("notifications").insert({
                "profile_id": recipient_id,
                "message": f"💬 New message from {sender_name}: \"{cleaned_text[:60]}\"",
                "read": False,
            }).execute()
        except Exception:
            pass

    created_record = msg_insert.data[0] if msg_insert.data else {}
    return {
        "data": {
            "id": str(created_record.get("id") or uuid.uuid4()),
            "offer_id": offer_id,
            "sender_id": str(sender_id) if sender_id else "",
            "sender_role": sender_role,
            "sender_name": sender_name,
            "text": cleaned_text,
            "created_at": created_record.get("created_at") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
    }
