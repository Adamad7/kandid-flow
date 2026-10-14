"""Pydantic schemas for Application Settings and Configuration."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AutoParseModeType = Literal[
    "auto_ollama_fallback_api", "auto_ollama_only", "auto_api_only", "manual"
]
ApiProviderType = Literal["gemini", "openai"]


class AppSettingsBase(BaseModel):
    """Base fields for runtime application settings (non-secret only)."""

    auto_parse_mode: AutoParseModeType = Field(
        default="auto_ollama_fallback_api",
        description="LLM normalization execution mode",
    )
    ollama_base_url: str = Field(
        default="http://host.docker.internal:11434",
        description="Base URL for local Ollama instance",
    )
    ollama_model: str = Field(
        default="qwen2.5:14b",
        description="Model identifier to use on Ollama",
    )
    api_provider: ApiProviderType = Field(
        default="gemini",
        description="Cloud LLM provider for fallback",
    )
    api_model: str = Field(
        default="gemini-2.5-flash",
        description="Model identifier for cloud LLM provider",
    )


class AppSettingsUpdate(BaseModel):
    """Schema for updating application settings."""

    auto_parse_mode: AutoParseModeType | None = None
    ollama_base_url: str | None = None
    ollama_model: str | None = None
    api_provider: ApiProviderType | None = None
    api_model: str | None = None


class AppSettingsRead(AppSettingsBase):
    """Schema for reading application settings."""

    id: int = Field(default=1, description="Singleton settings ID")
    updated_at: datetime = Field(..., description="Timestamp of last settings modification")

    model_config = ConfigDict(from_attributes=True)
