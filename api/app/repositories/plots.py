from app.repositories._db import Row, db, first, one, point_ewkt, rows


def insert_plot(farmer_id: str, village_id: str, lat: float, lng: float, acres: float, radius_m: float) -> Row:
    res = (
        db()
        .table("plots")
        .insert(
            {
                "farmer_id": farmer_id,
                "village_id": village_id,
                "centre": point_ewkt(lat, lng),
                "radius_m": radius_m,
                "acres": acres,
            }
        )
        .execute()
    )
    return one(res)


def get_plot(plot_id: str) -> Row | None:
    res = db().table("plots").select("id, farmer_id, village_id, acres").eq("id", plot_id).execute()
    return first(res)


def list_plots(farmer_id: str) -> list[Row]:
    res = db().table("plots").select("id, village_id, acres").eq("farmer_id", farmer_id).execute()
    return rows(res)
