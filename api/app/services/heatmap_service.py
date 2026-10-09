from typing import Any

from app.repositories import heatmap


def build_zone(row: dict[str, Any]) -> dict[str, Any]:
    """One village's demand against supply. A zone is unfilled while demand is above supply."""
    demand = float(row["demand_tonnes"])
    supply = float(row["supply_tonnes"])
    unfilled = max(0.0, demand - supply)
    return {
        "village_id": row["village_id"],
        "name": row["name"],
        "lat": row["lat"],
        "lng": row["lng"],
        "demand_tonnes": round(demand, 1),
        "supply_tonnes": round(supply, 1),
        "unfilled_tonnes": round(unfilled, 1),
        "is_unfilled_zone": unfilled > 0,
    }


def get_village_heatmap() -> list[dict[str, Any]]:
    """Village-level only. Villages with neither demand nor supply are left out."""
    zones = [build_zone(row) for row in heatmap.village_demand_supply()]
    return [zone for zone in zones if zone["demand_tonnes"] > 0 or zone["supply_tonnes"] > 0]
