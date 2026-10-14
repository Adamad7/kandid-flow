"""Application configuration using Pydantic Settings."""

import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global configuration settings for KandidFlow Backend."""

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://kandid_user:kandid_secret_change_me@db:5432/kandid_db"

    # Security & Extensions
    EXTENSION_API_TOKEN: str = "kandid_dev_secret_token_replace_in_production_32chars"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # LLM Settings
    AUTO_PARSE_MODE: str = "auto_ollama_fallback_api"
    OLLAMA_BASE_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "qwen2.5:14b"
    API_PROVIDER: str = "gemini"
    API_MODEL: str = "gemini-2.5-flash"
    GEMINI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Return list of allowed CORS origins, allowing Chrome extension schemes."""
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return origins if origins else ["*"]


settings = Settings()
