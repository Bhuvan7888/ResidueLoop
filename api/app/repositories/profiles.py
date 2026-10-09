from app.repositories._db import Row, db, first


def get_by_phone(phone: str) -> Row | None:
    res = db().table("profiles").select("id, role, language").eq("phone", phone).execute()
    return first(res)
