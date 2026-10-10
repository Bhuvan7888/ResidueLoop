import base64
import binascii
import os
from pathlib import PurePosixPath
from uuid import uuid4

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.security import get_supabase_client
from app.repositories.farmer_repository import FarmerRepository
from app.schemas.farmer import FarmerProfileCreate, PlotCreate


def point_wkt(lng: float, lat: float) -> str:
    return f"SRID=4326;POINT({lng} {lat})"


def encrypted_content(content: bytes, encoded_key: str) -> bytes:
    try:
        key = base64.urlsafe_b64decode(encoded_key)
    except binascii.Error as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Upload is unavailable") from error
    if len(key) != 32:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Upload is unavailable")
    nonce = os.urandom(12)
    return nonce + AESGCM(key).encrypt(nonce, content, None)


async def create_farmer_profile(user_id: str, profile_data: FarmerProfileCreate) -> None:
    repository = FarmerRepository(get_supabase_client())
    repository.upsert_profile(user_id, profile_data.name, profile_data.language)
    repository.upsert_farmer(user_id, profile_data.village_id)


async def create_plot(user_id: str, plot_data: PlotCreate) -> str:
    repository = FarmerRepository(get_supabase_client())
    return repository.create_plot(
        user_id,
        {
            "village_id": plot_data.village_id,
            "centre": point_wkt(plot_data.lng, plot_data.lat),
            "acres": plot_data.acres,
        },
    )


async def upload_id_document(user_id: str, id_type: str, id_last4: str, file: UploadFile) -> str:
    header = await file.read(4)
    await file.seek(0)
    extension = ".jpg" if header.startswith(b"\xff\xd8\xff") else ".png" if header.startswith(b"\x89PNG") else ".pdf" if header.startswith(b"%PDF") else None
    if extension is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only JPEG, PNG, and PDF are allowed")

    settings = get_settings()
    if not settings.id_document_encryption_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Upload is unavailable")

    content = await file.read()
    document_id = uuid4()
    path = str(PurePosixPath(user_id) / f"{document_id}{extension}.enc")
    repository = FarmerRepository(get_supabase_client())
    repository.upload_document(path, encrypted_content(content, settings.id_document_encryption_key))

    rejected = settings.mock_id_review and id_last4 == "0000"
    verification_status = "rejected" if rejected else "verified" if settings.mock_id_review else "pending"
    repository.create_verification(
        {
            "farmer_id": user_id,
            "id_type": id_type,
            "id_last4": id_last4,
            "document_path": path,
            "status": verification_status,
            "rejection_reason": "Demo rejection for the 0000 test case" if rejected else None,
        }
    )
    repository.update_farmer_status(user_id, verification_status)
    return verification_status
