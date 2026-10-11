from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    database_url: str
    nasa_firms_map_key: str = "mock"
    cdse_client_id: str = "mock"
    cdse_client_secret: str = "mock"
    nbr_drop_threshold: float = 0.1
    verification_window_days: int = 30
    plot_buffer_radius_m: float = 100.0
    twilio_auth_token: str | None = None
    llm_api_key: str | None = None
    id_document_encryption_key: str | None = None
    mock_id_review: bool = True
    matching_weight_distance: float = 0.35
    matching_weight_price: float = 0.35
    matching_weight_capacity: float = 0.20
    matching_weight_availability: float = 0.10
    pool_radius_km: float = 15.0
    whatsapp_access_token: str | None = None
    whatsapp_phone_number_id: str | None = None
    whatsapp_verify_token: str = "residueloop-0cb6fc51a8d5"
    meta_app_secret: str | None = None
    graph_api_version: str = "v20.0"
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
