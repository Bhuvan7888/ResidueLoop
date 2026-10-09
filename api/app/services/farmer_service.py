import math
import uuid

from fastapi import UploadFile

from app.core.config import get_settings
from app.core.enums import IdStatus
from app.core.errors import ConflictError, DomainError
from app.repositories import farmers, plots

ACCEPTED_ID_TYPES = {"aadhaar", "voter_id", "driving_licence", "pan"}
MOCK_REJECTED_LAST4 = "0000"
SQUARE_METRES_PER_ACRE = 4046.86
_SIGNATURES = (b"\xff\xd8\xff", b"\x89PNG", b"%PDF")


def plot_radius_m(acres: float) -> float:
    """Radius of a circle with the plot's area, used as the satellite buffer."""
    return round(math.sqrt(acres * SQUARE_METRES_PER_ACRE / math.pi), 1)


def create_plot(user_id: str, village_id: str, lat: float, lng: float, acres: float) -> dict[str, object]:
    farmers.ensure_farmer(user_id, village_id)
    return plots.insert_plot(user_id, village_id, lat, lng, acres, plot_radius_m(acres))


def review_id(id_last4: str) -> tuple[IdStatus, str | None]:
    # MOCK: the hackathon build auto-approves. Last four "0000" is the seeded rejection case.
    if not get_settings().mock_id_review:
        return IdStatus.PENDING, None
    if id_last4 == MOCK_REJECTED_LAST4:
        return IdStatus.REJECTED, "Invalid ID document"
    return IdStatus.VERIFIED, None


async def upload_id_document(user_id: str, id_type: str, id_last4: str, file: UploadFile) -> IdStatus:
    if id_type not in ACCEPTED_ID_TYPES or not (len(id_last4) == 4 and id_last4.isdigit()):
        raise DomainError("Invalid ID type or last four digits")
    header = await file.read(4)
    if not header.startswith(_SIGNATURES):
        raise DomainError("Only JPEG, PNG and PDF files are accepted")
    if farmers.get_farmer(user_id) is None:
        raise ConflictError("Add your village and a plot before submitting an ID")

    status, reason = review_id(id_last4)
    # MOCK: the file is validated but not stored or encrypted yet. Only the path a real upload would use is recorded.
    farmers.insert_id_verification(user_id, id_type, id_last4, f"{user_id}/{uuid.uuid4()}", status, reason)
    farmers.set_id_status(user_id, status)
    return status
