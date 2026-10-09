from typing import Any

from app.core.security import get_supabase_client

Row = dict[str, Any]


def db() -> Any:
    return get_supabase_client()


def rows(response: Any) -> list[Row]:
    data: list[Row] = response.data
    return data


def one(response: Any) -> Row:
    return rows(response)[0]


def first(response: Any) -> Row | None:
    found = rows(response)
    return found[0] if found else None


def point_ewkt(lat: float, lng: float) -> str:
    """PostgREST accepts EWKT text for PostGIS geometry columns."""
    return f"SRID=4326;POINT({lng} {lat})"
