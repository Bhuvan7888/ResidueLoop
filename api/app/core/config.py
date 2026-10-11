from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    database_url: str

    # Satellite verification (Unit 07). "mock" makes the integrations return fixture results.
    nasa_firms_map_key: str = "mock"
    cdse_client_id: str = "mock"
    cdse_client_secret: str = "mock"
    nbr_drop_threshold: float = 0.1
    verification_window_days: int = 30
    plot_buffer_radius_m: float = 100.0
    # MOCK: lets the verification route return a fixed verdict (?scenario=). Demo only, off by default.
    allow_verification_scenarios: bool = False

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

    # WhatsApp (Meta Cloud API) and the LLM parser. Empty keys are fine while the flags below are on.
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_verify_token: str = ""
    meta_app_secret: str = ""
    graph_api_version: str = "v25.0"
    public_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "gemini-flash-lite-latest"
    whatsapp_max_message_chars: int = 500

    # MOCK: no outbound WhatsApp send, replies are only stored and logged. Turn off with a real access token.
    mock_whatsapp_send: bool = True
    # MOCK: a keyword parser stands in for the LLM. Turn off once LLM_API_KEY is set.
    mock_llm_parser: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
