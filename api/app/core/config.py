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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
