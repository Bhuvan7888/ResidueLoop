from app.repositories._db import Row, db, rows


def village_demand_supply() -> list[Row]:
    return rows(db().rpc("village_demand_supply", {}).execute())
