import re
from typing import Any, Literal

from fastapi import HTTPException, status

from app.core.security import get_supabase_client
from app.repositories.profile_repository import ProfileRepository

SignUpRole = Literal["farmer", "buyer", "donor"]
PHONE_PATTERN = re.compile(r"^\+?91\d{10}$")


def create_profile(user_id: str, phone: str, role: SignUpRole) -> dict[str, Any]:
    """Persist the first-time role selected by the authenticated account."""
    if not phone.startswith("+"):
        phone = "+" + phone
        
    if not PHONE_PATTERN.fullmatch(phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid Indian phone number is required",
        )

    repository = ProfileRepository(get_supabase_client())
    if repository.exists(user_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A profile already exists for this account",
        )

    return repository.create(user_id, phone, role)
