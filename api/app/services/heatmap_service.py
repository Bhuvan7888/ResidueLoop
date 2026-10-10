from typing import Any
from app.core.security import get_supabase_client

def get_village_heatmap() -> list[dict[str, Any]]:
    """Village-level only. Villages with neither demand nor supply are left out."""
    client = get_supabase_client()
    
    # 1. Fetch all villages
    villages_resp = client.table("villages").select("id, name, lat, lng").execute()
    villages = {v["id"]: {"name": v["name"], "lat": v["lat"], "lng": v["lng"], "demand_tonnes": 0.0, "supply_tonnes": 0.0} for v in villages_resp.data}
    
    # 2. Fetch all open demand posts
    demand_resp = client.table("demand_posts").select("tonnes_needed").eq("status", "open").execute()
    # For a hackathon, we assume all demand applies globally or we just mock assign to first village if no location mapping
    if demand_resp.data and len(villages) > 0:
        first_v_id = list(villages.keys())[0]
        for d in demand_resp.data:
            villages[first_v_id]["demand_tonnes"] += float(d["tonnes_needed"])

    # 3. Fetch all open listings
    listings_resp = client.table("listings").select("est_tonnes, plots(village_id)").in_("status", ["open", "matched", "pooled"]).execute()
    for l in listings_resp.data:
        plots = l.get("plots")
        v_id = plots.get("village_id") if plots else None
        if v_id in villages:
            villages[v_id]["supply_tonnes"] += float(l["est_tonnes"])
            
    zones = []
    for v_id, v in villages.items():
        if v["demand_tonnes"] > 0 or v["supply_tonnes"] > 0:
            unfilled = max(0.0, v["demand_tonnes"] - v["supply_tonnes"])
            zones.append({
                "village_id": v_id,
                "name": v["name"],
                "lat": v["lat"],
                "lng": v["lng"],
                "demand_tonnes": round(v["demand_tonnes"], 1),
                "supply_tonnes": round(v["supply_tonnes"], 1),
                "unfilled_tonnes": round(unfilled, 1),
                "is_unfilled_zone": unfilled > 0,
            })
            
    return zones
