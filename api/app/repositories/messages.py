from typing import Any

from postgrest.exceptions import APIError

from app.repositories._db import db

UNIQUE_VIOLATION = "23505"


def insert_message(fields: dict[str, Any]) -> bool:
    """Store one message. Returns False when the provider message id was already stored (a replay)."""
    try:
        db().table("messages").insert(fields).execute()
    except APIError as error:
        if error.code == UNIQUE_VIOLATION:
            return False
        raise
    return True


def update_message(provider_message_id: str, fields: dict[str, Any]) -> None:
    db().table("messages").update(fields).eq("provider_message_id", provider_message_id).execute()
