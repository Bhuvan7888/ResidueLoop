from datetime import timedelta, date
import logging
from app.core.security import get_supabase_client
from app.core.config import get_settings
from app.integrations.firms import FirmsClient
from app.integrations.sentinel import SentinelClient

logger = logging.getLogger(__name__)

async def _evaluate_verdict(lat: float, lon: float, radius_km: float, window_start: date, window_end: date) -> tuple[str, str, float, int]:
    settings = get_settings()
    firms_client = FirmsClient()
    sentinel_client = SentinelClient()
    
    firms_hits = await firms_client.get_fire_hits(lat, lon, radius_km, window_start, window_end)
    nbr_change = await sentinel_client.get_nbr_change(lat, lon, window_start, window_end)
    
    verdict, confidence = "inconclusive", "low"
    if firms_hits > 0 or (nbr_change is not None and nbr_change > settings.nbr_drop_threshold):
        verdict, confidence = "fire_detected", "high"
    elif nbr_change is None:
        verdict, confidence = "inconclusive", "low"
    else:
        verdict, confidence = "verified", "high"
        
    return verdict, confidence, nbr_change if nbr_change is not None else 0.0, firms_hits

def _notify_stakeholders(client, listing_id: str, verdict: str) -> None:
    req_res = client.table("assistance_requests").select("ngo_id").eq("listing_id", listing_id).execute()
    ngo_ids = set([r["ngo_id"] for r in req_res.data])
    donor_ids = set()
    if ngo_ids:
        don_res = client.table("donations").select("donor_id").in_("ngo_id", list(ngo_ids)).execute()
        donor_ids = set([d["donor_id"] for d in don_res.data])

    messages = {
        "verified": "Great news! A plot you helped fund was verified clear of fire.",
        "fire_detected": "A plot you helped fund unfortunately registered fire activity. The NGO is reviewing support.",
        "inconclusive": "A plot you helped fund could not be conclusively verified due to cloud cover. We will check again later."
    }
    
    notifications = [{"profile_id": uid, "message": messages.get(verdict, "Verification complete.")} for uid in ngo_ids.union(donor_ids)]
    if notifications:
        client.table("notifications").insert(notifications).execute()

async def run_plot_verification(listing_id: str) -> None:
    client = get_supabase_client()
    settings = get_settings()
    
    res = client.table("listings").select("plot_id, harvest_date, plots(radius_m, centre)").eq("id", listing_id).single().execute()
    if not res.data:
        logger.error(f"Listing {listing_id} not found for verification")
        return
        
    plot_id = res.data["plot_id"]
    from datetime import datetime
    window_start = datetime.strptime(res.data["harvest_date"], "%Y-%m-%d").date()
    window_end = window_start + timedelta(days=settings.verification_window_days)
    
    try:
        lon, lat = res.data["plots"]["centre"]["coordinates"]
    except Exception:
        lat, lon = 30.0, 75.0
        
    radius_km = float(res.data["plots"]["radius_m"] or settings.plot_buffer_radius_m) / 1000.0

    verdict, confidence, nbr_val, firms_hits = await _evaluate_verdict(lat, lon, radius_km, window_start, window_end)
    
    client.table("verifications").insert({
        "plot_id": plot_id, "window_start": window_start.isoformat(), "window_end": window_end.isoformat(),
        "firms_hits": firms_hits, "nbr_delta": nbr_val, "verdict": verdict, "confidence": confidence
    }).execute()
    
    _notify_stakeholders(client, listing_id, verdict)
    logger.info(f"Verification complete for plot {plot_id}: {verdict}")
