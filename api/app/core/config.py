from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    database_url: str

    # Matching weights. They sum to 1 and are tunable without code changes.
    match_weight_distance: float = 0.4
    match_weight_price: float = 0.3
    match_weight_capacity: float = 0.2
    match_weight_availability: float = 0.1
    match_max_distance_km: float = 150.0

    # Straw yield assumption (to validate with a real farmer), tonnes per acre.
    tonnes_per_acre_min: float = 2.0
    tonnes_per_acre_max: float = 3.0

    # Pooling and pickup scheduling.
    default_min_load_tonnes: float = 8.0
    pool_pickup_lead_days: int = 3
    offer_pickup_window_days: int = 2

    # MOCK: ID review is auto-approved in the hackathon build, last four "0000" is rejected.
    mock_id_review: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
