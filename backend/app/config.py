from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Firebase
    firebase_project_id: str
    firebase_service_account_key_path: str = "./serviceAccountKey.json"
    firebase_storage_bucket: str

    # Anthropic
    anthropic_api_key: str

    # Google Cloud
    google_application_credentials: str = "./serviceAccountKey.json"

    # OpenAI (Whisper fallback)
    openai_api_key: str = ""

    # App
    app_env: str = "development"
    app_secret_key: str = "change-me-in-production"
    allowed_origins: str = "http://localhost:3000,http://localhost:8081"

    # SMS
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # Caching TTLs
    token_verify_cache_ttl_seconds: int = 300
    insight_cache_ttl_seconds: int = 86400

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
