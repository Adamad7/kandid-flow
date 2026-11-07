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
        default="gemini-3.8-flash",
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
    has_gemini_api_key: bool = Field(
        default=False, description="Whether a valid GEMINI_API_KEY is configured in .env"
    )
    has_openai_api_key: bool = Field(
        default=False, description="Whether a valid OPENAI_API_KEY is configured in .env"
    )

    model_config = ConfigDict(from_attributes=True)


class OllamaTestRequest(BaseModel):
    """Request payload to test local Ollama connectivity."""

    ollama_base_url: str | None = Field(
        default=None, description="Optional override for Ollama base URL"
    )
    ollama_model: str | None = Field(
        default=None, description="Optional override for Ollama model identifier"
    )


class CloudTestRequest(BaseModel):
    """Request payload to test cloud provider connectivity."""

    provider: ApiProviderType = Field(
        ..., description="Cloud provider to test ('gemini' or 'openai')"
    )
    model: str | None = Field(default=None, description="Optional model identifier override")


class SettingsConnectionTestResponse(BaseModel):
    """Response payload summarizing connectivity test results."""

    success: bool = Field(..., description="Whether connection and probe test succeeded")
    message: str = Field(..., description="Status or error message")
    available_models: list[str] | None = Field(
        default=None, description="List of models detected on the remote or local instance"
    )
    latency_ms: float | None = Field(
        default=None, description="Round-trip response latency in milliseconds"
    )
