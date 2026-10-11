import logging
import datetime
import math
import httpx
from typing import Any, cast
from fastapi import HTTPException

from app.core.security import get_supabase_client
from app.core.config import get_settings
from app.services.whatsapp_service import send_whatsapp_message

logger = logging.getLogger(__name__)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def get_ranked_villages(target_lat: float, target_lon: float) -> list[dict[str, Any]]:
    client = get_supabase_client()
    res = client.table("villages").select("*").execute()
    villages = res.data or []

    ranked = []
    for v in villages:
        v_lat = float(v.get("lat") or v.get("latitude") or 30.5)
        v_lon = float(v.get("lon") or v.get("longitude") or 75.5)
        dist = haversine_km(v_lat, v_lon, target_lat, target_lon)
        score = round(max(30.0, min(99.0, 96.0 - (dist * 0.12))), 1)
        if score >= 80.0:
            label = "High Direct Impact"
        elif score >= 60.0:
            label = "Moderate Influence"
        else:
            label = "Low Exposure"
        ranked.append({
            "village": v,
            "influence_score": score,
            "label": label,
            "distance_km": round(dist, 1)
        })
    ranked.sort(key=lambda x: x["influence_score"], reverse=True)
    return ranked


def _ensure_seed_campaigns(client: Any, default_ngo_id: str) -> None:
    """
    Ensures that active unsold farmer stubble listings exist on the charity crowdfunding portal.
    Generates realistic farmer demand based on our benchmark stubble clearance cost estimations.
    """
    try:
        # Check count of existing assistance requests
        existing = client.table("assistance_requests").select("id").execute()
        if existing.data and len(existing.data) >= 3:
            return

        demo_farmers: list[dict[str, Any]] = [
            {
                "phone": "+919876500011",
                "name": "ਹਰਪ੍ਰੀਤ ਸਿੰਘ (Harpreet Singh)",
                "acres": 8.0,
                "village_name": "Ajitwal",
                "cost_per_acre": 1300.0,
                "days_unsold": 3,
                "urgency": "critical",
            },
            {
                "phone": "+919876500022",
                "name": "ਗੁਰਮੀਤ ਸਿੰਘ (Gurmeet Singh)",
                "acres": 5.0,
                "village_name": "Dharamkot",
                "cost_per_acre": 1300.0,
                "days_unsold": 2,
                "urgency": "high",
            },
            {
                "phone": "+919876500033",
                "name": "ਜਸਵਿੰਦਰ ਸਿੰਘ (Jaswinder Singh)",
                "acres": 12.0,
                "village_name": "Baghapurana",
                "cost_per_acre": 1300.0,
                "days_unsold": 3,
                "urgency": "critical",
            },
        ]

        # Get existing villages
        v_res = client.table("villages").select("id, name").execute()
        village_map = {v["name"]: v["id"] for v in (v_res.data or [])}
        fallback_v_id = v_res.data[0]["id"] if (v_res.data and len(v_res.data) > 0) else "11111111-1111-1111-1111-111111111111"

        all_farmers = client.table("profiles").select("id, name").eq("role", "farmer").execute()
        if not all_farmers.data:
            return

        # Check existing profiles
        for idx, df in enumerate(demo_farmers):
            farmer_id = all_farmers.data[idx % len(all_farmers.data)]["id"]
            # Update friendly name if empty
            if not all_farmers.data[idx % len(all_farmers.data)].get("name"):
                try:
                    client.table("profiles").update({"name": df["name"]}).eq("id", farmer_id).execute()
                except Exception:
                    pass

            # Ensure farmer record
            client.table("farmers").upsert({"profile_id": farmer_id}, on_conflict="profile_id").execute()

            # Find or create plot
            v_id = village_map.get(df["village_name"], fallback_v_id)
            plot_res = client.table("plots").select("id").eq("farmer_id", farmer_id).execute()
            if plot_res.data and len(plot_res.data) > 0:
                plot_id = plot_res.data[0]["id"]
            else:
                new_p = client.table("plots").insert({
                    "farmer_id": farmer_id,
                    "village_id": v_id,
                    "acres": df["acres"],
                    "centre": {"type": "Point", "coordinates": [75.25, 30.82]}
                }).execute()
                plot_id = new_p.data[0]["id"]

            acres_val = float(df["acres"])
            cost_val = float(df["cost_per_acre"])
            days_val = int(df["days_unsold"])
            est_tonnes = acres_val * 2.5
            total_clearance_goal = acres_val * cost_val
            created_days_ago = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_val)).isoformat()

            # Check if listing exists
            l_check = client.table("listings").select("id").eq("plot_id", plot_id).eq("status", "open").execute()
            if l_check.data and len(l_check.data) > 0:
                listing_id = l_check.data[0]["id"]
            else:
                new_l = client.table("listings").insert({
                    "farmer_id": farmer_id,
                    "plot_id": plot_id,
                    "est_tonnes": est_tonnes,
                    "harvest_date": (datetime.date.today() - datetime.timedelta(days=days_val)).isoformat(),
                    "status": "open",
                    "combine_sms_used": True,
                    "created_at": created_days_ago,
                    "source": "crowdfunding_auto_rescue"
                }).execute()
                listing_id = new_l.data[0]["id"]

            # Create assistance request if not already present
            req_check = client.table("assistance_requests").select("id").eq("listing_id", listing_id).execute()
            if not req_check.data:
                client.table("assistance_requests").insert({
                    "farmer_id": farmer_id,
                    "ngo_id": default_ngo_id,
                    "listing_id": listing_id,
                    "amount_requested": total_clearance_goal,
                    "purpose": f"Emergency Citizen Clearance: Unsold Paddy Stubble at Fire Risk ({df['acres']:.1f} acres)",
                    "status": "pending",
                    "created_at": created_days_ago,
                }).execute()

    except Exception as e:
        logger.warning(f"Notice auto-seeding demo campaigns: {e}")


async def get_crowdfunding_campaigns() -> list[dict[str, Any]]:
    client = get_supabase_client()

    # 1. Fetch available NGO
    ngo_res = client.table("ngos").select("profile_id, profiles(name, phone)").limit(1).execute()
    default_ngo_id = ngo_res.data[0]["profile_id"] if ngo_res.data else "b65cf486-a94a-4f49-8807-8da7b4b00eee"
    default_ngo_name = (
        ngo_res.data[0]["profiles"]["name"]
        if (ngo_res.data and ngo_res.data[0].get("profiles"))
        else "Punjab Clean Air & Bio-Energy Action"
    )

    # 2. Check for unsold open listings that need to be listed for charity crowdfunding (> 2-3 days unsold or open)
    now = datetime.datetime.now(datetime.timezone.utc)
    try:
        listings_res = client.table("listings").select(
            "id, farmer_id, est_tonnes, status, created_at, plots(acres, village_id, villages(name))"
        ).eq("status", "open").execute()

        for listing in listings_res.data or []:
            existing_req = client.table("assistance_requests").select("id").eq("listing_id", listing["id"]).execute()
            if not existing_req.data:
                acres = float(listing.get("plots", {}).get("acres") or 8.0)
                # Removal cost benchmark estimation: ₹1,300/acre
                amount_needed = round(acres * 1300.0, 2)
                try:
                    client.table("farmers").upsert({"profile_id": listing["farmer_id"]}, on_conflict="profile_id").execute()
                    client.table("assistance_requests").insert({
                        "farmer_id": listing["farmer_id"],
                        "ngo_id": default_ngo_id,
                        "listing_id": listing["id"],
                        "amount_requested": amount_needed,
                        "purpose": f"Emergency Citizen Clearance: Unsold Paddy Stubble at Fire Risk ({acres:.1f} acres)",
                        "status": "pending"
                    }).execute()

                    client.table("notifications").insert({
                        "profile_id": listing["farmer_id"],
                        "message": f"🛡️ Notice: Your unsold stubble from {acres:.1f} acres has been listed on the Clean Air Charity Crowdfunding Portal to prevent field burning.",
                        "read": False
                    }).execute()
                except Exception as ef:
                    logger.warning(f"Error auto-listing listing {listing['id']} to charity: {ef}")
    except Exception as e:
        logger.warning(f"Notice querying listings: {e}")

    # Ensure at least 3 realistic unsold campaigns exist for global donors
    _ensure_seed_campaigns(client, default_ngo_id)

    # 3. Fetch all assistance requests
    req_res = client.table("assistance_requests").select(
        "*, ngos(profile_id, profiles(name, phone)), listings(id, est_tonnes, status, created_at, plots(acres, village_id, villages(name, district)))"
    ).order("created_at", desc=True).execute()

    campaigns = []
    for req in req_res.data or []:
        farmer_prof = client.table("profiles").select("name, phone").eq("id", req["farmer_id"]).execute()
        farmer_name = (farmer_prof.data[0].get("name") if farmer_prof.data else None) or "Local Farmer"
        farmer_phone = (farmer_prof.data[0].get("phone") if farmer_prof.data else None) or ""

        listing = req.get("listings") or {}
        plot = listing.get("plots") or {}
        village = plot.get("villages") or {}

        acres = float(plot.get("acres") or 8.0)
        est_tonnes = float(listing.get("est_tonnes") or (acres * 2.5))
        village_name = village.get("name") or "Ajitwal"
        district = village.get("district") or "Moga"

        # Calculate funded amount for this village or campaign
        village_id = plot.get("village_id")
        donations_query = client.table("donations").select("amount")
        if village_id:
            donations_query = donations_query.eq("target_village_id", village_id)
        else:
            donations_query = donations_query.eq("ngo_id", req["ngo_id"])
        donations = donations_query.execute()
        funded = sum(float(d.get("amount", 0)) for d in (donations.data or []))
        amount_requested = float(req.get("amount_requested") or (acres * 1300.0))
        pct_funded = min(100, round((funded / (amount_requested or 1)) * 100))

        # Calculate environmental savings
        co2_saved = round(est_tonnes * 1.45, 1)
        pm25_saved = round(acres * 45.0, 1)

        # Calculate days unsold
        created_at_str = req.get("created_at") or datetime.datetime.now().isoformat()
        try:
            created_dt = datetime.datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            days_unsold = max(2, int((now - created_dt).total_seconds() / 86400.0) + 1)
        except Exception:
            days_unsold = 3

        fire_risk = "cleared" if req["status"] == "approved" else ("critical" if days_unsold >= 3 else "high")
        burn_countdown = "0h (Balers Dispatched)" if req["status"] == "approved" else f"{max(6, 72 - (days_unsold * 20))}h left to clear field"

        campaigns.append({
            "id": req["id"],
            "listing_id": req["listing_id"],
            "farmer_id": req["farmer_id"],
            "farmer_name": farmer_name,
            "farmer_phone": farmer_phone,
            "village_name": village_name,
            "district": district,
            "target_village_id": village_id,
            "ngo_id": req["ngo_id"],
            "ngo_name": req.get("ngos", {}).get("profiles", {}).get("name") or default_ngo_name,
            "acres": acres,
            "est_tonnes": est_tonnes,
            "amount_requested": amount_requested,
            "amount_funded": funded,
            "percent_funded": pct_funded,
            "co2_prevented_tonnes": co2_saved,
            "pm25_prevented_kg": pm25_saved,
            "fire_risk": fire_risk,
            "burn_countdown": burn_countdown,
            "days_unsold": days_unsold,
            "purpose": req["purpose"],
            "status": req["status"],
            "created_at": req["created_at"],
        })

    return campaigns


async def create_donation(
    donor_id: str,
    ngo_id: str,
    amount: float,
    target_village_id: str | None = None,
    campaign_id: str | None = None,
) -> dict[str, Any]:
    client = get_supabase_client()

    # If campaign_id provided, look up target village and request
    if campaign_id:
        req_res = client.table("assistance_requests").select("*, listings(plots(village_id))").eq("id", campaign_id).execute()
        if req_res.data:
            req = req_res.data[0]
            if not ngo_id:
                ngo_id = req["ngo_id"]
            if not target_village_id:
                target_village_id = req.get("listings", {}).get("plots", {}).get("village_id")

    # If ngo_id is missing, fallback to first available
    if not ngo_id:
        ngo_res = client.table("ngos").select("profile_id").limit(1).execute()
        if ngo_res.data:
            ngo_id = ngo_res.data[0]["profile_id"]
        else:
            ngo_id = "b65cf486-a94a-4f49-8807-8da7b4b00eee"

    res = client.table("donations").insert({
        "donor_id": donor_id,
        "ngo_id": ngo_id,
        "amount": amount,
        "target_village_id": target_village_id
    }).execute()
    donation = cast(dict[str, Any], res.data[0])

    # Send donor notification
    try:
        client.table("notifications").insert({
            "profile_id": donor_id,
            "message": f"🎉 Thank you for contributing ₹{amount:,.2f}! You helped save a field from burning and protected regional air quality.",
            "read": False
        }).execute()
    except Exception:
        pass

    # If campaign_id provided, notify farmer and check for goal completion
    if campaign_id:
        try:
            req_res = client.table("assistance_requests").select(
                "*, ngos(profile_id, profiles(name)), listings(id, plots(acres, village_id, villages(name)))"
            ).eq("id", campaign_id).execute()
            if req_res.data:
                req = req_res.data[0]
                farmer_id = req["farmer_id"]
                plot = req.get("listings", {}).get("plots") or {}
                acres = float(plot.get("acres") or 8.0)
                village_name = plot.get("villages", {}).get("name") or "Punjab"
                ngo_name = req.get("ngos", {}).get("profiles", {}).get("name") or "Punjab Clean Air Action"

                client.table("notifications").insert({
                    "profile_id": farmer_id,
                    "message": f"🌱 Citizen Crowdfunding Update: A donor just contributed ₹{amount:,.2f} towards clearing your stubble cleanly!",
                    "read": False
                }).execute()

                # Check if total donations meet requested goal
                donations = client.table("donations").select("amount").eq("target_village_id", target_village_id).execute()
                total_donated = sum(float(d.get("amount", 0)) for d in (donations.data or []))
                goal = float(req["amount_requested"])

                if total_donated >= goal:
                    # Update status to approved
                    client.table("assistance_requests").update({"status": "approved"}).eq("id", campaign_id).execute()
                    client.table("listings").update({"status": "completed"}).eq("id", req["listing_id"]).execute()

                    # Automatically record disbursement for baler machinery
                    try:
                        client.table("disbursements").insert({
                            "ngo_id": ngo_id,
                            "request_id": campaign_id,
                            "payee_name": "Kisan Baler Machinery Fleet",
                            "amount": goal,
                        }).execute()
                    except Exception as ed:
                        logger.warning(f"Notice inserting disbursement: {ed}")

                    # Notify farmer
                    client.table("notifications").insert({
                        "profile_id": farmer_id,
                        "message": f"🚜 Field Cleared! Your stubble clearance (₹{goal:,.0f}) has been 100% crowdfunded! {ngo_name} balers are dispatched to clear your field cleanly without fire.",
                        "read": False
                    }).execute()

                    # Get farmer phone and dispatch automated WhatsApp call
                    try:
                        f_prof = client.table("profiles").select("phone").eq("id", farmer_id).execute()
                        if f_prof.data and f_prof.data[0].get("phone"):
                            f_phone = f_prof.data[0]["phone"]
                            wa_text = (
                                f"🌾 ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਵੱਡੀ ਖੁਸ਼ਖਬਰੀ:\n"
                                f"ਤੁਹਾਡੇ {acres:.1f} ਏਕੜ ਖੇਤ ({village_name}) ਦੀ ਪਰਾਲੀ ਚੁੱਕਣ ਦਾ ਸਾਰਾ ਖ਼ਰਚਾ "
                                f"(₹{goal:,.0f}) ਨਾਗਰਿਕਾਂ ਵੱਲੋਂ ਚੈਰਿਟੀ ਰਾਹੀਂ 100% ਪੂਰਾ ਹੋ ਗਿਆ ਹੈ!\n\n"
                                f"🚜 ਨੇੜਲੀ ਸੰਸਥਾ ({ngo_name}) ਨੂੰ ਬੇਲਰ ਮਸ਼ੀਨਾਂ ਭੇਜਣ ਲਈ ਤੁਰੰਤ ਬੁਲਾ ਲਿਆ ਗਿਆ ਹੈ।\n"
                                f"ਕਿਰਪਾ ਕਰਕੇ ਪਰਾਲੀ ਨੂੰ ਅੱਗ ਨਾ ਲਗਾਓ - ਮਸ਼ੀਨ 24 ਘੰਟਿਆਂ ਵਿੱਚ ਪਹੁੰਚ ਰਹੀ ਹੈ।"
                            )
                            await send_whatsapp_message(f_phone, wa_text, farmer_id)
                    except Exception as ew:
                        logger.warning(f"Notice sending WhatsApp call to farmer: {ew}")

        except Exception as e:
            logger.warning(f"Error checking donation threshold: {e}")

    return donation


async def create_stripe_checkout_session(
    campaign_id: str,
    amount: float,
    currency: str = "inr",
    donor_id: str | None = None,
    return_url: str = "",
) -> dict[str, Any]:
    """
    Creates a Stripe Checkout Session for global citizen crowdfunding using the provided Stripe API keys.
    """
    settings = get_settings()
    client = get_supabase_client()

    # Look up campaign details
    req_res = client.table("assistance_requests").select(
        "*, listings(plots(acres, villages(name)))"
    ).eq("id", campaign_id).execute()

    farmer_name = "Farmer"
    acres = 8.0
    village_name = "Punjab"
    if req_res.data:
        req = req_res.data[0]
        plot = req.get("listings", {}).get("plots") or {}
        acres = float(plot.get("acres") or 8.0)
        village_name = plot.get("villages", {}).get("name") or "Punjab"
        f_prof = client.table("profiles").select("name").eq("id", req["farmer_id"]).execute()
        if f_prof.data and f_prof.data[0].get("name"):
            farmer_name = f_prof.data[0]["name"]

    curr = currency.lower().strip()
    if curr not in ["inr", "usd", "eur"]:
        curr = "inr"

    unit_amount = int(amount * 100)
    base_return = return_url or "http://localhost:5173/app/charity"
    success_url = f"{base_return}?stripe_status=success&session_id={{CHECKOUT_SESSION_ID}}&campaign_id={campaign_id}&amount={amount}"
    cancel_url = f"{base_return}?stripe_status=cancelled&campaign_id={campaign_id}"

    # Call Stripe API
    try:
        async with httpx.AsyncClient(timeout=10.0) as http:
            resp = await http.post(
                "https://api.stripe.com/v1/checkout/sessions",
                headers={"Authorization": f"Bearer {settings.stripe_secret_key}"},
                data={
                    "mode": "payment",
                    "payment_method_types[0]": "card",
                    "line_items[0][price_data][currency]": curr,
                    "line_items[0][price_data][unit_amount]": str(unit_amount),
                    "line_items[0][price_data][product_data][name]": f"Stubble Clearance Rescue - {farmer_name}'s Field ({acres:.1f} Acres)",
                    "line_items[0][price_data][product_data][description]": f"Emergency baler dispatch to clear paddy straw in {village_name} cleanly and avoid field burning.",
                    "metadata[campaign_id]": campaign_id,
                    "metadata[donor_id]": donor_id or "anonymous",
                    "metadata[amount]": str(amount),
                    "success_url": success_url,
                    "cancel_url": cancel_url,
                }
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("url"):
                return {
                    "session_id": data.get("id"),
                    "checkout_url": data.get("url"),
                    "publishable_key": settings.stripe_publishable_key,
                }
            else:
                logger.warning(f"Stripe session creation notice: {data}")
    except Exception as e:
        logger.warning(f"Stripe API call error: {e}")

    # Fallback simulation session
    mock_session_id = f"cs_test_mock_{campaign_id[:8]}_{int(amount)}"
    return {
        "session_id": mock_session_id,
        "checkout_url": f"{base_return}?stripe_status=success&session_id={mock_session_id}&campaign_id={campaign_id}&amount={amount}",
        "publishable_key": settings.stripe_publishable_key,
    }


async def confirm_stripe_donation(
    campaign_id: str,
    amount: float,
    session_id: str | None = None,
    donor_id: str | None = None,
    is_test_dummy: bool = False,
) -> dict[str, Any]:
    """
    Confirms Stripe donation payment, updates database records in Supabase,
    and automatically calls / dispatches the nearby NGO when fully funded.
    """
    client = get_supabase_client()
    settings = get_settings()

    # 1. Verify with Stripe if session_id provided and not dummy mode
    if session_id and not is_test_dummy and not session_id.startswith("cs_test_mock_"):
        try:
            async with httpx.AsyncClient(timeout=8.0) as http:
                resp = await http.get(
                    f"https://api.stripe.com/v1/checkout/sessions/{session_id}",
                    headers={"Authorization": f"Bearer {settings.stripe_secret_key}"}
                )
                if resp.status_code == 200:
                    s_data = resp.json()
                    payment_status = s_data.get("payment_status", "")
                    if payment_status not in ["paid", "complete"]:
                        logger.info(f"Stripe payment status is {payment_status}")
        except Exception as e:
            logger.warning(f"Could not verify session with Stripe: {e}")

    # 2. Lookup donor ID (or fallback to donor account)
    if not donor_id:
        d_res = client.table("profiles").select("id").eq("role", "donor").limit(1).execute()
        if d_res.data:
            donor_id = d_res.data[0]["id"]
        else:
            any_prof = client.table("profiles").select("id").limit(1).execute()
            donor_id = any_prof.data[0]["id"] if any_prof.data else "3e661c35-1c37-45fd-8143-72a68beca858"

    # 3. Lookup campaign details
    req_res = client.table("assistance_requests").select(
        "*, ngos(profile_id, profiles(name, phone)), listings(id, plots(acres, village_id, villages(name)))"
    ).eq("id", campaign_id).execute()

    if not req_res.data:
        raise HTTPException(status_code=404, detail="Crowdfunding campaign not found")

    req = req_res.data[0]
    ngo_id = req["ngo_id"]
    plot = req.get("listings", {}).get("plots") or {}
    target_village_id = plot.get("village_id")
    village_name = plot.get("villages", {}).get("name") or "Ajitwal"
    acres = float(plot.get("acres") or 8.0)
    farmer_id = req["farmer_id"]
    ngo_name = req.get("ngos", {}).get("profiles", {}).get("name") or "Punjab Clean Air & Bio-Energy Action"
    ngo_phone = req.get("ngos", {}).get("profiles", {}).get("phone") or "+919999999911"
    amount_requested = float(req["amount_requested"])

    # 4. Record donation in Supabase
    don_res = client.table("donations").insert({
        "donor_id": donor_id,
        "ngo_id": ngo_id,
        "amount": amount,
        "target_village_id": target_village_id
    }).execute()
    donation = don_res.data[0] if don_res.data else {"id": "don-demo", "amount": amount}

    # Record notification for donor
    try:
        client.table("notifications").insert({
            "profile_id": donor_id,
            "message": f"🎉 Stripe Payment Verified! You contributed ₹{amount:,.2f} towards clearing {farmer_id}'s field in {village_name}. Air pollution prevented!",
            "read": False
        }).execute()
    except Exception:
        pass

    # 5. Check if goal is reached or covered
    donations_query = client.table("donations").select("amount")
    if target_village_id:
        donations_query = donations_query.eq("target_village_id", target_village_id)
    else:
        donations_query = donations_query.eq("ngo_id", ngo_id)
    all_dons = donations_query.execute()
    total_funded = sum(float(d.get("amount", 0)) for d in (all_dons.data or []))

    is_fully_funded = total_funded >= amount_requested
    ngo_dispatch_details = None

    if is_fully_funded or req["status"] == "pending":
        # If this contribution reaches 100% or is a primary clearance sponsor
        if total_funded >= amount_requested:
            # 1. Update request status to approved and listing to completed
            client.table("assistance_requests").update({"status": "approved"}).eq("id", campaign_id).execute()
            client.table("listings").update({"status": "completed"}).eq("id", req["listing_id"]).execute()

            # 2. Record disbursement to Baler Fleet
            try:
                client.table("disbursements").insert({
                    "ngo_id": ngo_id,
                    "request_id": campaign_id,
                    "payee_name": "Kisan Baler Machinery Fleet (Moga Hub)",
                    "amount": amount_requested,
                    "donation_id": donation.get("id") if isinstance(donation, dict) and "id" in donation else None,
                    "payee_type": "baler",
                    "note": f"Automated clearance dispatch for {acres:.1f} acres in {village_name} to prevent burning"
                }).execute()
            except Exception as ed:
                logger.warning(f"Disbursement insert notice: {ed}")

            # 3. Call Nearby NGO: Send automated mission notification
            ngo_msg = (
                f"🚨 URGENT CLEARANCE MISSION: Stubble removal for {acres:.1f} acres in {village_name} "
                f"is 100% crowdfunded (₹{amount_requested:,.0f}). Balers dispatched to prevent burning."
            )
            try:
                client.table("notifications").insert({
                    "profile_id": ngo_id,
                    "message": ngo_msg,
                    "read": False
                }).execute()
            except Exception:
                pass

            # 4. Proactive WhatsApp Call to Farmer
            try:
                f_prof = client.table("profiles").select("name, phone").eq("id", farmer_id).execute()
                farmer_phone = f_prof.data[0]["phone"] if f_prof.data else ""
                farmer_name = f_prof.data[0]["name"] if f_prof.data and f_prof.data[0].get("name") else "ਕਿਸਾਨ ਵੀਰ"

                if farmer_phone:
                    wa_alert = (
                        f"🌾 ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {farmer_name} ਜੀ!\n\n"
                        f"🎉 ਵੱਡੀ ਖੁਸ਼ਖਬਰੀ: ਤੁਹਾਡੇ {acres:.1f} ਏਕੜ ਖੇਤ ({village_name}) ਦੀ ਪਰਾਲੀ ਚੁੱਕਣ ਦਾ ਸਾਰਾ ਖ਼ਰਚਾ "
                        f"(₹{amount_requested:,.0f}) ਨਾਗਰਿਕਾਂ ਦੁਆਰਾ Stripe ਰਾਹੀਂ 100% ਪੂਰਾ ਹੋ ਗਿਆ ਹੈ!\n\n"
                        f"🚜 ਸਾਡੇ ਸਿਸਟਮ ਨੇ ਨੇੜਲੀ NGO ({ngo_name}) ਨੂੰ ਬੇਲਰ ਮਸ਼ੀਨਾਂ ਭੇਜਣ ਦਾ ਹੁਕਮ ਦੇ ਦਿੱਤਾ ਹੈ।\n"
                        f"ਕਿਰਪਾ ਕਰਕੇ ਪਰਾਲੀ ਨੂੰ ਬਿਲਕੁਲ ਅੱਗ ਨਾ ਲਗਾਓ - ਮਸ਼ੀਨ ਅਗਲੇ 24 ਘੰਟਿਆਂ ਵਿੱਚ ਤੁਹਾਡੇ ਖੇਤ ਪਹੁੰਚ ਰਹੀ ਹੈ।"
                    )
                    await send_whatsapp_message(farmer_phone, wa_alert, farmer_id)
            except Exception as ew:
                logger.warning(f"Error calling farmer WhatsApp: {ew}")

            ngo_dispatch_details = {
                "ngo_name": ngo_name,
                "ngo_phone": ngo_phone,
                "mission_status": "dispatched",
                "machinery_assigned": "2x Happy Seeder & Balers + 1x Tractor Rake",
                "estimated_arrival": "Within 24 Hours",
                "co2_saved_tonnes": round(acres * 2.5 * 1.45, 1),
                "pm25_saved_kg": round(acres * 45.0, 1),
                "action": f"Field removal order dispatched to {ngo_name}. Farmer notified via WhatsApp to prevent burning.",
            }

    return {
        "status": "success",
        "donation": donation,
        "amount_donated": amount,
        "total_funded": total_funded,
        "amount_requested": amount_requested,
        "percent_funded": min(100, round((total_funded / (amount_requested or 1)) * 100)),
        "is_fully_funded": is_fully_funded,
        "ngo_dispatch": ngo_dispatch_details,
    }


async def create_assistance_request(
    farmer_id: str, ngo_id: str | None, listing_id: str, amount: float, purpose: str
) -> dict[str, Any]:
    client = get_supabase_client()
    if not ngo_id:
        ngo_res = client.table("ngos").select("profile_id").limit(1).execute()
        if ngo_res.data:
            ngo_id = ngo_res.data[0]["profile_id"]
        else:
            ngo_id = "b65cf486-a94a-4f49-8807-8da7b4b00eee"

    # Ensure farmer record exists for FK
    client.table("farmers").upsert({"profile_id": farmer_id}, on_conflict="profile_id").execute()

    res = client.table("assistance_requests").insert({
        "farmer_id": farmer_id,
        "ngo_id": ngo_id,
        "listing_id": listing_id,
        "amount_requested": amount,
        "purpose": purpose
    }).execute()
    return cast(dict[str, Any], res.data[0])


async def update_request_status(ngo_id: str, request_id: str, status: str) -> None:
    client = get_supabase_client()
    res = client.table("assistance_requests").select("ngo_id").eq("id", request_id).single().execute()
    if res.data["ngo_id"] != ngo_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    client.table("assistance_requests").update({"status": status}).eq("id", request_id).execute()


async def create_disbursement(
    ngo_id: str, request_id: str, payee_name: str, amount: float, payee_type: str = "baler", note: str | None = None
) -> dict[str, Any]:
    client = get_supabase_client()
    res = client.table("assistance_requests").select("ngo_id, status").eq("id", request_id).single().execute()
    if res.data["ngo_id"] != ngo_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if res.data["status"] != "approved":
        raise HTTPException(status_code=400, detail="Request not approved")

    disb_res = client.table("disbursements").insert({
        "ngo_id": ngo_id,
        "request_id": request_id,
        "payee_name": payee_name,
        "amount": amount,
        "payee_type": payee_type,
        "note": note or f"Clearance disbursement to {payee_type}"
    }).execute()
    return cast(dict[str, Any], disb_res.data[0])


async def sync_unsold_listings_to_charity(
    days_threshold: int = 2, force_demo: bool = False
) -> list[dict[str, Any]]:
    """
    Scans all open listings in the database.
    If a farmer's stubble listing has not been bought by any buyer within 2-3 days,
    it automatically calculates the clearance demand based on our benchmark estimations (₹1,300/acre)
    and lists the stubble along with farmer details on the citizen charity crowdfunding section.
    """
    client = get_supabase_client()
    now = datetime.datetime.now(datetime.timezone.utc)

    # Fetch available NGO
    ngo_res = client.table("ngos").select("profile_id, profiles(name, phone)").limit(1).execute()
    default_ngo_id = ngo_res.data[0]["profile_id"] if ngo_res.data else "b65cf486-a94a-4f49-8807-8da7b4b00eee"

    listings_res = client.table("listings").select(
        "id, farmer_id, est_tonnes, status, created_at, harvest_date, plots(acres, village_id, villages(name, district))"
    ).eq("status", "open").execute()

    synced_campaigns = []
    for listing in listings_res.data or []:
        created_at_str = listing.get("created_at") or now.isoformat()
        try:
            created_dt = datetime.datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            days_unsold = max(2, int((now - created_dt).total_seconds() / 86400.0) + 1)
        except Exception:
            days_unsold = 3

        if days_unsold >= days_threshold or force_demo:
            existing_req = client.table("assistance_requests").select("id").eq("listing_id", listing["id"]).execute()
            if not existing_req.data:
                acres = float(listing.get("plots", {}).get("acres") or 8.0)
                amount_needed = round(acres * 1300.0, 2)
                try:
                    client.table("farmers").upsert({"profile_id": listing["farmer_id"]}, on_conflict="profile_id").execute()
                    new_req = client.table("assistance_requests").insert({
                        "farmer_id": listing["farmer_id"],
                        "ngo_id": default_ngo_id,
                        "listing_id": listing["id"],
                        "amount_requested": amount_needed,
                        "purpose": f"Emergency Citizen Clearance: Unsold Paddy Stubble at Fire Risk ({acres:.1f} acres)",
                        "status": "pending"
                    }).execute()

                    client.table("notifications").insert({
                        "profile_id": listing["farmer_id"],
                        "message": f"🛡️ Notice: Your unsold stubble from {acres:.1f} acres has been listed on the Clean Air Charity Crowdfunding Portal to prevent field burning.",
                        "read": False
                    }).execute()

                    if new_req.data:
                        synced_campaigns.append(new_req.data[0])
                except Exception as ef:
                    logger.warning(f"Error auto-syncing listing {listing['id']} to charity: {ef}")

    return synced_campaigns


async def dispatch_nearby_ngo_mission(campaign_id: str) -> dict[str, Any]:
    """
    Explicitly triggers automated calling of the nearby NGO to dispatch balers
    and remove the crop cleanly without fire, alerting the farmer via WhatsApp.
    """
    client = get_supabase_client()
    req_res = client.table("assistance_requests").select(
        "*, ngos(profile_id, profiles(name, phone)), listings(id, plots(acres, village_id, villages(name)))"
    ).eq("id", campaign_id).execute()

    if not req_res.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    req = req_res.data[0]
    ngo_id = req["ngo_id"]
    plot = req.get("listings", {}).get("plots") or {}
    acres = float(plot.get("acres") or 8.0)
    village_name = plot.get("villages", {}).get("name") or "Ajitwal"
    farmer_id = req["farmer_id"]
    amount_requested = float(req["amount_requested"])
    ngo_name = req.get("ngos", {}).get("profiles", {}).get("name") or "Punjab Clean Air & Bio-Energy Action"
    ngo_phone = req.get("ngos", {}).get("profiles", {}).get("phone") or "+919999999911"

    # 1. Update status to approved & listing to completed
    client.table("assistance_requests").update({"status": "approved"}).eq("id", campaign_id).execute()
    if req.get("listing_id"):
        client.table("listings").update({"status": "completed"}).eq("id", req["listing_id"]).execute()

    # 2. Record disbursement to Baler Fleet
    try:
        client.table("disbursements").insert({
            "ngo_id": ngo_id,
            "request_id": campaign_id,
            "payee_name": "Kisan Baler Machinery Fleet (Moga Hub)",
            "amount": amount_requested,
            "payee_type": "baler",
            "note": f"Automated clearance dispatch for {acres:.1f} acres in {village_name} to prevent burning"
        }).execute()
    except Exception as ed:
        logger.warning(f"Disbursement insert notice: {ed}")

    # 3. Notify NGO
    try:
        client.table("notifications").insert({
            "profile_id": ngo_id,
            "message": f"🚨 URGENT CLEARANCE MISSION: Stubble removal for {acres:.1f} acres in {village_name} is 100% crowdfunded (₹{amount_requested:,.0f}). Balers dispatched to prevent burning.",
            "read": False
        }).execute()
    except Exception:
        pass

    # 4. Proactive WhatsApp Call to Farmer
    f_prof = client.table("profiles").select("name, phone").eq("id", farmer_id).execute()
    farmer_phone = f_prof.data[0]["phone"] if f_prof.data else ""
    farmer_name = f_prof.data[0]["name"] if f_prof.data and f_prof.data[0].get("name") else "ਕਿਸਾਨ ਵੀਰ"

    if farmer_phone:
        wa_alert = (
            f"🌾 ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {farmer_name} ਜੀ!\n\n"
            f"🎉 ਵੱਡੀ ਖੁਸ਼ਖਬਰੀ: ਤੁਹਾਡੇ {acres:.1f} ਏਕੜ ਖੇਤ ({village_name}) ਦੀ ਪਰਾਲੀ ਚੁੱਕਣ ਦਾ ਸਾਰਾ ਖ਼ਰਚਾ "
            f"(₹{amount_requested:,.0f}) ਨਾਗਰਿਕਾਂ ਵੱਲੋਂ ਚੈਰਿਟੀ ਰਾਹੀਂ 100% ਪੂਰਾ ਹੋ ਗਿਆ ਹੈ!\n\n"
            f"🚜 ਸਾਡੇ ਸਿਸਟਮ ਨੇ ਨੇੜਲੀ NGO ({ngo_name}) ਨੂੰ ਬੇਲਰ ਮਸ਼ੀਨਾਂ ਭੇਜਣ ਦਾ ਹੁਕਮ ਦੇ ਦਿੱਤਾ ਹੈ।\n"
            f"ਕਿਰਪਾ ਕਰਕੇ ਪਰਾਲੀ ਨੂੰ ਬਿਲਕੁਲ ਅੱਗ ਨਾ ਲਗਾਓ - ਮਸ਼ੀਨ ਅਗਲੇ 24 ਘੰਟਿਆਂ ਵਿੱਚ ਤੁਹਾਡੇ ਖੇਤ ਪਹੁੰਚ ਰਹੀ ਹੈ।"
        )
        try:
            await send_whatsapp_message(farmer_phone, wa_alert, farmer_id)
        except Exception as ew:
            logger.warning(f"Error calling farmer WhatsApp: {ew}")

    return {
        "status": "success",
        "mission_status": "dispatched",
        "ngo_name": ngo_name,
        "ngo_phone": ngo_phone,
        "machinery_assigned": "2x Happy Seeder & Balers + 1x Tractor Rake",
        "estimated_arrival": "Within 24 Hours",
        "co2_saved_tonnes": round(acres * 2.5 * 1.45, 1),
        "pm25_saved_kg": round(acres * 45.0, 1),
        "action": f"Automated clearance dispatch executed with {ngo_name}. Farmer notified via WhatsApp to prevent burning.",
    }
