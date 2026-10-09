from datetime import date

from app.core.errors import NotFoundError
from app.repositories import buyers


def create_buyer_profile(
    user_id: str,
    org_name: str,
    buyer_type: str,
    lat: float,
    lng: float,
    capacity: int,
    price_per_tonne: float,
    min_load_tonnes: float,
) -> None:
    buyers.upsert_buyer(user_id, org_name, buyer_type, lat, lng, capacity, price_per_tonne, min_load_tonnes)


def create_demand_post(
    user_id: str,
    tonnes_needed: float,
    price_per_tonne: float,
    lat: float,
    lng: float,
    date_from: date,
    date_to: date,
) -> str:
    if buyers.get_buyer(user_id) is None:
        raise NotFoundError("Create your buyer profile first")
    fields = {
        "tonnes_needed": tonnes_needed,
        "price_per_tonne": price_per_tonne,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
    }
    return str(buyers.insert_demand_post(user_id, fields, lat, lng)["id"])


def update_demand_post(user_id: str, post_id: str, fields: dict[str, object]) -> None:
    post = buyers.get_demand_post(post_id)
    if post is None or post["buyer_id"] != user_id:
        raise NotFoundError("Demand post not found")
    if fields:
        buyers.update_demand_post(post_id, fields)
