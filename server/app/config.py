from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


SERVER_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    app_access_token: str
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    deepseek_api_key: str | None = None
    mimo_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=SERVER_ENV_FILE, extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
