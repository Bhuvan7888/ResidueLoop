from datetime import date

from app.core.config import get_settings
from app.core.enums import IdStatus, ListingSource
from app.core.errors import DomainError, ForbiddenError, NotFoundError
from app.repositories import farmers, listings, plots
from app.services import matching_service


def estimate_tonnes(acres: float) -> float:
    """Midpoint of the configured straw yield range, shown to the farmer as an estimate."""
    settings = get_settings()
    return round(acres * (settings.tonnes_per_acre_min + settings.tonnes_per_acre_max) / 2, 1)


def estimate_bounds(acres: float) -> tuple[float, float]:
    settings = get_settings()
    return acres * settings.tonnes_per_acre_min, acres * settings.tonnes_per_acre_max


def create_listing(
    user_id: str,
    plot_id: str,
    harvest_date: date,
    combine_sms_used: bool,
    est_tonnes: float | None = None,
    source: ListingSource = ListingSource.WEB,
) -> dict[str, object]:
    farmer = farmers.get_farmer(user_id)
    if farmer is None or farmer["id_status"] != IdStatus.VERIFIED:
        raise ForbiddenError("Only verified farmers can create a listing")

    plot = plots.get_plot(plot_id)
    if plot is None or plot["farmer_id"] != user_id:
        raise NotFoundError("Plot not found")

    tonnes = est_tonnes if est_tonnes is not None else estimate_tonnes(plot["acres"])
    low, high = estimate_bounds(plot["acres"])
    if not low <= tonnes <= high:
        raise DomainError(f"Estimate must be between {low:.1f} and {high:.1f} tonnes for this plot")

    listing = listings.insert_listing(user_id, plot_id, tonnes, harvest_date, combine_sms_used, source)
    offer = matching_service.match_listing(user_id, listing["id"])
    return {"id": listing["id"], "est_tonnes": tonnes, "offer_id": offer["id"] if offer else None}
