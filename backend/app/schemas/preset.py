"""Pydantic schemas for Base CV Presets / Archetypes."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.cv import CVLayoutSchema


class BaseCVPresetBase(BaseModel):
    """Base schema for Archetype CV Presets."""

    title: str = Field(
        ...,
        max_length=100,
        description="Preset archetype title (e.g. 'Senior Flutter Developer', 'DevOps Specialist')",
    )
    language: str = Field(
        default="pl",
        description="Target language of the preset: pl or en",
    )
    layout_schema: CVLayoutSchema = Field(
        ...,
        description=(
            "Pre-crafted structured CV blocks (summary, skills, experience, projects, etc.)"
        ),
    )


class BaseCVPresetCreate(BaseCVPresetBase):
    """Schema for creating a new Archetype CV Preset."""

    pass


class BaseCVPresetUpdate(BaseModel):
    """Schema for updating an existing Archetype CV Preset."""

    title: str | None = Field(default=None, max_length=100)
    language: str | None = None
    layout_schema: CVLayoutSchema | None = None


class BaseCVPresetRead(BaseCVPresetBase):
    """Schema for returning Archetype CV Preset details."""

    id: UUID = Field(..., description="Unique preset identifier")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")

    model_config = ConfigDict(from_attributes=True)
