from typing import Any
from app.core.security import get_supabase_client

def get_village_heatmap() -> list[dict[str, Any]]:
    """Village-level only. Visualizes industrial demand vs farmer straw supply."""
    client = get_supabase_client()

    # 1. Fetch all villages with PostGIS geometry
    villages_resp = client.table("villages").select("id, name, district, geometry").execute()
    villages: dict[str, dict[str, Any]] = {}
    for v in (villages_resp.data or []):
        v_id = str(v["id"])
        geom = v.get("geometry") or {}
        coords = geom.get("coordinates") if isinstance(geom, dict) else None
        lng = float(coords[0]) if coords and len(coords) >= 2 else 75.2
        lat = float(coords[1]) if coords and len(coords) >= 2 else 30.85
        villages[v_id] = {
            "village_id": v_id,
            "name": v.get("name", "Village"),
            "district": v.get("district", "Punjab"),
            "lat": lat,
            "lng": lng,
            "demand_tonnes": 0.0,
            "supply_tonnes": 0.0,
            "listings_count": 0,
            "prices": [],
        }

    # 2. Fetch all open demand posts
    try:
        demand_resp = (
            client.table("demand_posts")
            .select("tonnes_needed, price_per_tonne, location")
            .eq("status", "open")
            .execute()
        )
        for d in (demand_resp.data or []):
            tonnes = float(d.get("tonnes_needed") or 0.0)
            price = float(d.get("price_per_tonne") or 1500.0)
            d_loc = d.get("location") or {}
            d_coords = d_loc.get("coordinates") if isinstance(d_loc, dict) else None
            if d_coords and len(d_coords) >= 2 and villages:
                d_lng, d_lat = float(d_coords[0]), float(d_coords[1])
                closest_v = min(
                    villages.values(),
                    key=lambda v: (v["lat"] - d_lat) ** 2 + (v["lng"] - d_lng) ** 2,
                )
                closest_v["demand_tonnes"] += tonnes
                closest_v["prices"].append(price)
            elif villages:
                first_v = list(villages.values())[0]
                first_v["demand_tonnes"] += tonnes
                first_v["prices"].append(price)
    except Exception as e:
        print(f"Error reading demand posts: {e}")

    # 3. Fetch all active listings (not cancelled)
    try:
        listings_resp = (
            client.table("listings")
            .select("id, est_tonnes, status, plot_id, plots(acres, village_id, centre), offers(price_per_tonne, status)")
            .neq("status", "cancelled")
            .execute()
        )
        for listing_item in (listings_resp.data or []):
            plots = listing_item.get("plots") or {}
            plot_village_id: str | None = str(plots.get("village_id")) if plots.get("village_id") else None
            tonnes = float(listing_item.get("est_tonnes") or 0.0)

            # Extract any offer price for price benchmark
            offers = listing_item.get("offers") or []
            offer_price: float | None = None
            for off in offers:
                if off.get("price_per_tonne"):
                    offer_price = float(off["price_per_tonne"])
                    break

            target_v: dict[str, Any] | None = None
            if plot_village_id and plot_village_id in villages:
                target_v = villages[plot_village_id]
            elif isinstance(plots, dict) and plots.get("centre"):
                centre = plots.get("centre") or {}
                c_coords = centre.get("coordinates") if isinstance(centre, dict) else None
                if c_coords and len(c_coords) >= 2 and villages:
                    c_lng, c_lat = float(c_coords[0]), float(c_coords[1])
                    target_v = min(
                        villages.values(),
                        key=lambda v: (v["lat"] - c_lat) ** 2 + (v["lng"] - c_lng) ** 2,
                    )

            if not target_v and villages:
                target_v = list(villages.values())[0]

            if target_v:
                target_v["supply_tonnes"] += tonnes
                target_v["listings_count"] += 1
                if offer_price:
                    target_v["prices"].append(offer_price)
    except Exception as e:
        print(f"Error reading listings: {e}")

    # 4. If all villages have 0 activity, inject demo baseline values for visual representation
    has_activity = any(v["demand_tonnes"] > 0 or v["supply_tonnes"] > 0 for v in villages.values())
    if not has_activity and villages:
        demo_pairs = [(400.0, 150.0), (250.0, 290.0), (500.0, 180.0), (120.0, 320.0), (300.0, 300.0)]
        for idx, v in enumerate(villages.values()):
            dem, sup = demo_pairs[idx % len(demo_pairs)]
            v["demand_tonnes"] = dem
            v["supply_tonnes"] = sup
            v["prices"].append(1850.0)

    zones = []
    for v_id, v in villages.items():
        demand_t = round(float(v["demand_tonnes"]), 1)
        supply_t = round(float(v["supply_tonnes"]), 1)
        unfilled = max(0.0, round(demand_t - supply_t, 1))
        surplus = max(0.0, round(supply_t - demand_t, 1))
        prices_list = v.get("prices") or []
        avg_price = round(sum(prices_list) / len(prices_list), 0) if prices_list else 1850.0

        status = "balanced"
        if unfilled > 0 and demand_t > 0:
            status = "deficit"
        elif surplus > 0:
            status = "surplus"

        zones.append({
            "village_id": v_id,
            "name": v["name"],
            "district": v.get("district", "Punjab"),
            "lat": v["lat"],
            "lng": v["lng"],
            "demand_tonnes": demand_t,
            "supply_tonnes": supply_t,
            "unfilled_tonnes": unfilled,
            "surplus_tonnes": surplus,
            "is_unfilled_zone": unfilled > 0,
            "is_surplus_zone": surplus > 0,
            "listings_count": int(v.get("listings_count", 0)),
            "avg_price": avg_price,
            "status": status,
        })

    # Sort: active hotspots first (highest unfilled deficit first, then highest supply)
    zones.sort(key=lambda z: (z["is_unfilled_zone"], z["unfilled_tonnes"], z["supply_tonnes"]), reverse=True)
    return zones
