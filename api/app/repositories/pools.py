from datetime import date
from typing import Any

from app.core.enums import PoolStatus
from app.repositories._db import Row, db, first, one

_COLUMNS = "id, village_id, buyer_id, baler_id, status, target_tonnes, current_tonnes, pickup_date"


def find_forming_pool(buyer_id: str, village_id: str) -> Row | None:
    res = (
        db()
        .table("pools")
        .select(_COLUMNS)
        .eq("buyer_id", buyer_id)
        .eq("village_id", village_id)
        .eq("status", PoolStatus.FORMING.value)
        .limit(1)
        .execute()
    )
    return first(res)


def insert_pool(village_id: str, buyer_id: str, baler_id: str, target_tonnes: float) -> Row:
    res = (
        db()
        .table("pools")
        .insert(
            {
                "village_id": village_id,
                "buyer_id": buyer_id,
                "baler_id": baler_id,
                "status": PoolStatus.FORMING.value,
                "target_tonnes": target_tonnes,
                "current_tonnes": 0,
            }
        )
        .execute()
    )
    return one(res)


def get_pool(pool_id: str) -> Row | None:
    return first(db().table("pools").select(_COLUMNS).eq("id", pool_id).execute())


def update_pool(pool_id: str, current_tonnes: float, status: PoolStatus, pickup_date: date | None) -> None:
    fields: dict[str, Any] = {
        "current_tonnes": current_tonnes,
        "status": status.value,
        "pickup_date": pickup_date.isoformat() if pickup_date else None,
    }
    db().table("pools").update(fields).eq("id", pool_id).execute()


def set_pool_status(pool_id: str, status: PoolStatus) -> None:
    db().table("pools").update({"status": status.value}).eq("id", pool_id).execute()
