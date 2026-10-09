from app.repositories._db import Row, db, first, one, point_ewkt


def upsert_buyer(
    profile_id: str,
    org_name: str,
    buyer_type: str,
    lat: float,
    lng: float,
    capacity: int,
    price_per_tonne: float,
    min_load_tonnes: float,
) -> None:
    db().table("buyers").upsert(
        {
            "profile_id": profile_id,
            "org_name": org_name,
            "type": buyer_type,
            "location": point_ewkt(lat, lng),
            "capacity": capacity,
            "price_per_tonne": price_per_tonne,
            "min_load_tonnes": min_load_tonnes,
        }
    ).execute()


def get_buyer(profile_id: str) -> Row | None:
    res = db().table("buyers").select("profile_id, org_name, min_load_tonnes").eq("profile_id", profile_id).execute()
    return first(res)


def insert_demand_post(buyer_id: str, fields: Row, lat: float, lng: float) -> Row:
    res = (
        db().table("demand_posts").insert({"buyer_id": buyer_id, **fields, "location": point_ewkt(lat, lng)}).execute()
    )
    return one(res)


def get_demand_post(post_id: str) -> Row | None:
    res = db().table("demand_posts").select("id, buyer_id").eq("id", post_id).execute()
    return first(res)


def update_demand_post(post_id: str, fields: Row) -> None:
    db().table("demand_posts").update(fields).eq("id", post_id).execute()
