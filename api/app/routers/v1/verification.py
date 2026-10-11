from datetime import date, timedelta
import logging
from typing import Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.security import get_supabase_client
from app.services.verification_service import _evaluate_verdict, _notify_stakeholders

router = APIRouter(prefix="/verifications", tags=["verifications"])
logger = logging.getLogger(__name__)


class VerificationResponse(BaseModel):
    id: str | None = None
    plot_id: str
    verdict: str
    confidence: str
    firms_hits: int
    nbr_delta: float
    window_start: str
    window_end: str
    checked_at: str | None = None


@router.post("/trigger/{plot_id}")
async def trigger_plot_verification(
    plot_id: str,
    scenario: str = Query("real", description="One of: 'verified', 'fire_detected', 'inconclusive', 'real'")
) -> dict[str, Any]:
    """
    On-demand Satellite Verification endpoint for plots.
    Evaluates Sentinel-2 burn scar (NBR drop) and NASA FIRMS thermal anomaly hits.
    Supports real satellite execution or deterministic demo scenario validation.
    """
    client = get_supabase_client()
    settings = get_settings()

    # 1. Fetch plot details
    plot_res = client.table("plots").select("id, farmer_id, acres, centre, radius_m").eq("id", plot_id).maybe_single().execute()
    if not plot_res.data:
        raise HTTPException(status_code=404, detail="Plot not found")

    plot = plot_res.data
    today = date.today()
    window_start = today - timedelta(days=15)
    window_end = today + timedelta(days=settings.verification_window_days)

    try:
        lon, lat = plot.get("centre", {}).get("coordinates", [75.8, 30.9])
    except Exception:
        lat, lon = 30.9, 75.8

    radius_km = float(plot.get("radius_m") or settings.plot_buffer_radius_m) / 1000.0

    # 2. Evaluate verdict
    if scenario == "verified":
        verdict, confidence = "verified", "high"
        nbr_val, firms_hits = 0.04, 0
    elif scenario == "fire_detected":
        verdict, confidence = "fire_detected", "high"
        nbr_val, firms_hits = 0.35, 4
    elif scenario == "inconclusive":
        verdict, confidence = "inconclusive", "low"
        nbr_val, firms_hits = 0.0, 0
    else:
        # Real satellite check
        verdict, confidence, nbr_val, firms_hits = await _evaluate_verdict(
            lat, lon, radius_km, window_start, window_end
        )

    # 3. Persist verification record
    insert_payload = {
        "plot_id": plot_id,
        "window_start": window_start.isoformat(),
        "window_end": window_end.isoformat(),
        "firms_hits": firms_hits,
        "nbr_delta": round(float(nbr_val), 2),
        "verdict": verdict,
        "confidence": confidence,
    }
    insert_res = client.table("verifications").insert(insert_payload).execute()
    created_row = insert_res.data[0] if insert_res.data else insert_payload

    # 4. Notify farmer & linked stakeholders
    try:
        farmer_id = plot.get("farmer_id")
        verdict_labels = {
            "verified": "✅ Satellite Check: Plot verified clean of fire! Zero burn scars detected by Sentinel-2.",
            "fire_detected": "⚠️ Satellite Alert: Thermal fire anomaly detected on your plot. Verification flagged.",
            "inconclusive": "☁️ Satellite Check Inconclusive: Cloud cover obscured optical pass. Recheck scheduled."
        }
        notif_msg = verdict_labels.get(verdict, "Satellite check complete.")
        client.table("notifications").insert({
            "profile_id": farmer_id,
            "message": notif_msg
        }).execute()

        # Check for any listing on this plot to notify donors/NGOs
        listings_res = client.table("listings").select("id").eq("plot_id", plot_id).execute()
        for lst in listings_res.data:
            _notify_stakeholders(client, lst["id"], verdict)
    except Exception as e:
        logger.warning(f"Could not dispatch stakeholder notifications: {e}")

    logger.info(f"Satellite verification completed for plot {plot_id}: verdict={verdict}")
    return {"data": created_row}


@router.get("/plot/{plot_id}")
def get_plot_verifications(plot_id: str) -> dict[str, list[dict[str, Any]]]:
    """Retrieve satellite verification history for a plot."""
    client = get_supabase_client()
    res = client.table("verifications").select("*").eq("plot_id", plot_id).order("checked_at", desc=True).execute()
    return {"data": res.data or []}
