"""Pydantic schemas for CV generation, versioning, live preview, and inline refinement."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.candidate import CandidateContactInfo, CandidateSectionBlock

TailoringModeType = Literal["targeted_summary_keywords", "full"]


class CVLayoutSchema(BaseModel):
    """Normalized layout schema for CV compilation and rendering."""

    full_name: str | None = Field(default=None, description="Candidate name")
    job_title: str | None = Field(
        default=None,
        description=(
            "Target job title or professional headline "
            "(e.g. 'Flutter Developer', 'Junior DevOps Engineer')"
        ),
    )
    contact_info: CandidateContactInfo | None = Field(
        default=None, description="Contact information"
    )
    language: str = Field(default="pl", description="Resume language")
    sections: list[CandidateSectionBlock] = Field(
        default_factory=list, description="Ordered list of resume sections"
    )

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="before")
    @classmethod
    def handle_raw(cls, data: Any) -> Any:
        if isinstance(data, list):
            return {"sections": data}
        return data


class CVPreviewRequest(BaseModel):
    """Payload to request an immediate vector SVG preview from Typst compiler."""

    sections: list[str] = Field(
        default_factory=list,
        description=(
            "List of section IDs to render (e.g. ['summary', 'skills', 'experience', 'projects'])"
        ),
    )
    job_offer_id: UUID | None = Field(
        default=None, description="Optional job offer ID to contextualize preview"
    )
    language: str = Field(default="pl", description="Target language of the CV: pl or en")
    custom_instructions: str | None = Field(
        default=None, description="Optional inline prompt for AI refinement"
    )
    layout_schema: CVLayoutSchema | None = Field(
        default=None, description="Structured block definitions and content to compile"
    )


class CVPreviewResponse(BaseModel):
    """Response containing compiled vector SVG for real-time preview."""

    svg_pages: list[str] = Field(
        ...,
        description="List of vector SVG markup strings, one per page of the compiled CV",
    )
    svg_content: str = Field(
        default="",
        description="Concatenated SVG markup for backward compatibility",
    )
    version_id: UUID | None = Field(
        default=None, description="Associated CV version ID if already persisted"
    )


class CVSectionConfig(BaseModel):
    """Configuration for an individual CV section in generation request."""

    id: str = Field(..., description="Section identifier (e.g. 'summary', 'skills')")
    mode: Literal["off", "raw", "ai"] = Field(
        default="ai",
        description=(
            "Section generation mode: 'off' (omit), 'raw' (verbatim from knowledge base), "
            "'ai' (tailor with AI)"
        ),
    )

    model_config = ConfigDict(extra="ignore")


class CVGenerateRequest(BaseModel):
    """Request payload to initiate AI synthesis of a tailored CV version."""

    job_offer_id: UUID = Field(..., description="Target job offer to tailor against")
    sections: list[CVSectionConfig] = Field(
        default_factory=list,
        description="List of section configurations (modes: off, raw, ai)",
    )
    preset_id: UUID | None = Field(
        default=None, description="Optional Base CV Preset ID used as archetype foundation"
    )
    tailoring_mode: TailoringModeType = Field(
        default="full",
        description="Tailoring intensity: targeted_summary_keywords or full",
    )
    language: str = Field(default="pl", description="Target language for resume output: pl or en")
    custom_instructions: str | None = Field(
        default=None, description="Additional tailoring directives (e.g. 'Focus on Kubernetes')"
    )
    llm_provider: Literal["default", "local", "api", "ollama", "gemini", "openai"] = Field(
        default="default", description="Wybrany dostawca LLM do syntezy CV: default, local, api"
    )
    llm_model: str | None = Field(
        default=None, description="Opcjonalny identyfikator konkretnego modelu LLM"
    )
    api_key: str | None = Field(
        default=None, description="Opcjonalny niestandardowy klucz API do jednorazowego użycia"
    )
    enable_thinking: bool = Field(
        default=True, description="Włącz tryb namysłu (reasoning / thinking)"
    )

    @field_validator("sections", mode="before")
    @classmethod
    def parse_sections(cls, v: Any) -> list[dict[str, Any]]:
        if not isinstance(v, list):
            return []
        parsed: list[dict[str, Any]] = []
        for item in v:
            if isinstance(item, str):
                parsed.append({"id": item, "mode": "ai"})
            elif isinstance(item, dict):
                parsed.append(item)
            elif hasattr(item, "model_dump"):
                parsed.append(item.model_dump())
        return parsed


class CVVersionBase(BaseModel):
    """Base schema for tailored CV version record."""

    job_offer_id: UUID = Field(..., description="Associated job offer ID")
    parent_preset_id: UUID | None = Field(
        default=None, description="Optional archetype preset ID used as baseline"
    )
    version_number: int = Field(default=1, description="Sequential version index")
    is_active: bool = Field(default=True, description="Whether this version is currently active")
    language: str = Field(default="pl", description="Resume language: pl or en")
    layout_schema: CVLayoutSchema = Field(
        ..., description="Dynamic CV layout schema and content blocks"
    )
    change_summary: str | None = Field(
        default=None, description="Short summary of changes made in this version"
    )


class CVVersionCreate(CVVersionBase):
    """Schema for persisting a new CV version."""

    pass


class CVVersionUpdate(BaseModel):
    """Schema for modifying an existing CV version (e.g. from Split-View editor)."""

    parent_preset_id: UUID | None = None
    is_active: bool | None = None
    layout_schema: CVLayoutSchema | None = None
    change_summary: str | None = None


class CVVersionRead(CVVersionBase):
    """Schema for retrieving a saved CV version."""

    id: UUID = Field(..., description="Unique CV version identifier")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = ConfigDict(from_attributes=True)


class CVRefineBlockRequest(BaseModel):
    """Payload to request AI refinement of a single CV section block."""

    block_id: str = Field(..., description="ID of the section block to refine")
    instruction: str = Field(..., description="User prompt or directive for refinement")
    current_block: CandidateSectionBlock | None = Field(
        default=None, description="Current content of the block if refining prior to save"
    )
    llm_provider: Literal["default", "local", "api", "ollama", "gemini", "openai"] = Field(
        default="default", description="Wybrany dostawca LLM do udoskonalenia bloku"
    )
    llm_model: str | None = Field(default=None, description="Opcjonalny konkretny model LLM")
    enable_thinking: bool = Field(
        default=True, description="Włącz tryb namysłu (reasoning / thinking)"
    )


class CVRefineBlockResponse(BaseModel):
    """Response containing AI-refined section block."""

    block_id: str = Field(..., description="ID of the refined block")
    refined_block: CandidateSectionBlock = Field(..., description="Updated section block")
    version: CVVersionRead | None = Field(
        default=None, description="Updated CV version if modified in database"
    )
