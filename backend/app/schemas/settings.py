"""Pydantic schemas for Application Settings and Configuration."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AutoParseModeType = Literal[
    "auto_ollama_fallback_api", "auto_ollama_only", "auto_api_only", "manual"
]
ApiProviderType = Literal["gemini", "openai"]
ReasoningEffortType = Literal["low", "medium", "high"]
RoutingModeType = Literal["fallback", "local", "cloud"]
AITaskType = Literal[
    "job_parsing",
    "cv_generation",
    "cv_refinement",
    "knowledge_base_parsing",
]


class LocalModelConfig(BaseModel):
    """Configuration for local Ollama LLM execution."""

    model: str = Field(default="qwen2.5:14b", description="Model identifier for local Ollama")
    context_window: int = Field(
        default=32768,
        ge=2048,
        le=131072,
        description="Context window size in tokens for local execution",
    )
    enable_thinking: bool = Field(
        default=False, description="Enable thinking / reasoning mode if supported"
    )
    reasoning_effort: ReasoningEffortType = Field(
        default="medium", description="Reasoning effort level (low, medium, high)"
    )
    thinking_budget: int | None = Field(
        default=None, description="Maximum reasoning tokens budget if supported"
    )


class CloudModelConfig(BaseModel):
    """Configuration for Cloud LLM execution (Gemini or OpenAI)."""

    provider: ApiProviderType = Field(
        default="gemini", description="Cloud LLM provider (gemini or openai)"
    )
    model: str = Field(
        default="gemini-3.8-flash", description="Model identifier for cloud LLM provider"
    )
    context_window: int = Field(
        default=32768,
        ge=2048,
        le=2000000,
        description="Context window size in tokens for cloud execution",
    )
    enable_thinking: bool = Field(
        default=False, description="Enable thinking / reasoning mode if supported"
    )
    reasoning_effort: ReasoningEffortType = Field(
        default="medium", description="Reasoning effort level (low, medium, high)"
    )
    thinking_budget: int | None = Field(
        default=None, description="Maximum reasoning tokens budget if supported"
    )


class TaskModelConfig(BaseModel):
    """Configuration and connectivity status for an individual AI task."""

    routing_mode: RoutingModeType = Field(
        default="fallback",
        description="Execution routing strategy: fallback (local then cloud), local, or cloud",
    )
    local_model: LocalModelConfig = Field(default_factory=LocalModelConfig)
    cloud_model: CloudModelConfig = Field(default_factory=CloudModelConfig)
    local_test_passed: bool = Field(
        default=False, description="Status of the last local connectivity test for this task"
    )
    local_test_message: str | None = Field(
        default=None, description="Feedback message from last local test"
    )
    cloud_test_passed: bool = Field(
        default=False, description="Status of the last cloud connectivity test for this task"
    )
    cloud_test_message: str | None = Field(
        default=None, description="Feedback message from last cloud test"
    )


class AITasksConfig(BaseModel):
    """Per-task AI routing and model configurations across all system functions."""

    job_parsing: TaskModelConfig = Field(default_factory=TaskModelConfig)
    cv_generation: TaskModelConfig = Field(default_factory=TaskModelConfig)
    cv_refinement: TaskModelConfig = Field(default_factory=TaskModelConfig)
    knowledge_base_parsing: TaskModelConfig = Field(default_factory=TaskModelConfig)


def create_default_tasks_config(
    ollama_model: str = "qwen2.5:14b",
    api_provider: ApiProviderType = "gemini",
    api_model: str = "gemini-3.8-flash",
) -> AITasksConfig:
    """Create default per-task configuration initialized with specified models."""

    def _create_task() -> TaskModelConfig:
        return TaskModelConfig(
            routing_mode="fallback",
            local_model=LocalModelConfig(
                model=ollama_model,
                context_window=32768,
                enable_thinking=False,
                reasoning_effort="medium",
                thinking_budget=None,
            ),
            cloud_model=CloudModelConfig(
                provider=api_provider,
                model=api_model,
                context_window=32768,
                enable_thinking=False,
                reasoning_effort="medium",
                thinking_budget=None,
            ),
        )

    return AITasksConfig(
        job_parsing=_create_task(),
        cv_generation=_create_task(),
        cv_refinement=_create_task(),
        knowledge_base_parsing=_create_task(),
    )


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
    tasks_config: AITasksConfig = Field(
        default_factory=AITasksConfig,
        description="Per-task AI routing and model configurations",
    )


class AppSettingsUpdate(BaseModel):
    """Schema for updating application settings."""

    auto_parse_mode: AutoParseModeType | None = None
    ollama_base_url: str | None = None
    ollama_model: str | None = None
    api_provider: ApiProviderType | None = None
    api_model: str | None = None
    tasks_config: AITasksConfig | None = None


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
    context_window: int | None = Field(
        default=None, description="Optional context window size override"
    )
    enable_thinking: bool = Field(
        default=False, description="Enable thinking / reasoning probe if supported"
    )
    reasoning_effort: ReasoningEffortType | None = Field(
        default=None, description="Optional reasoning effort override"
    )
    thinking_budget: int | None = Field(
        default=None, description="Optional thinking budget override"
    )
    task: AITaskType | None = Field(
        default=None, description="Optional AI task identifier to update test status for"
    )


class CloudTestRequest(BaseModel):
    """Request payload to test cloud provider connectivity."""

    provider: ApiProviderType = Field(
        ..., description="Cloud provider to test ('gemini' or 'openai')"
    )
    model: str | None = Field(default=None, description="Optional model identifier override")
    context_window: int | None = Field(
        default=None, description="Optional context window size override"
    )
    enable_thinking: bool = Field(
        default=False, description="Enable thinking / reasoning probe if supported"
    )
    reasoning_effort: ReasoningEffortType | None = Field(
        default=None, description="Optional reasoning effort override"
    )
    thinking_budget: int | None = Field(
        default=None, description="Optional thinking budget override"
    )
    task: AITaskType | None = Field(
        default=None, description="Optional AI task identifier to update test status for"
    )


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


class OllamaModelItem(BaseModel):
    """Information about an installed Ollama model."""

    name: str = Field(description="Identyfikator i tag modelu np. qwen2.5:14b")
    size_bytes: int | None = Field(default=None, description="Rozmiar pliku modelu w bajtach")
    parameter_size: str | None = Field(default=None, description="Liczba parametrów np. 14B")
    quantization_level: str | None = Field(
        default=None, description="Poziom kwantyzacji np. Q4_K_M"
    )
    modified_at: datetime | None = Field(default=None, description="Data ostatniej modyfikacji")


class OllamaModelsResponse(BaseModel):
    """Response payload containing list of discovered Ollama models."""

    success: bool = Field(description="Czy udało się połączyć z serwerem Ollama")
    models: list[OllamaModelItem] = Field(
        default_factory=list, description="Lista wykrytych zainstalowanych modeli"
    )
    message: str = Field(description="Komunikat statusu lub opis błędu połączenia")
