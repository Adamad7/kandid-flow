"""Pydantic schemas for Job Attachments and File Management."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

JobAttachmentCategory = Literal[
    "cv_external",
    "cover_letter",
    "recruitment_task",
    "offer_letter",
    "other",
]


class JobAttachmentBase(BaseModel):
    """Base fields for job attachments."""

    job_offer_id: UUID = Field(..., description="ID of the associated job offer")
    event_id: UUID | None = Field(
        default=None, description="Optional ID of associated recruitment event"
    )
    file_name: str = Field(..., description="Original name of the uploaded file")
    mime_type: str = Field(..., description="MIME content type (e.g. application/pdf)")
    file_size_bytes: int = Field(..., description="File size in bytes")
    category: JobAttachmentCategory = Field(
        default="other", description="Category classification of the document"
    )
    notes: str | None = Field(default=None, description="Optional notes about the file")


class JobAttachmentCreate(JobAttachmentBase):
    """Schema for creating a job attachment record."""

    storage_path: str = Field(..., description="Path where file is stored on the disk")


class JobAttachmentUpdate(BaseModel):
    """Schema for updating attachment metadata."""

    category: JobAttachmentCategory | None = None
    event_id: UUID | None = None
    notes: str | None = None


class JobAttachmentRead(JobAttachmentBase):
    """Schema for returning job attachment details."""

    id: UUID = Field(..., description="Unique attachment identifier")
    created_at: datetime = Field(..., description="Upload timestamp")
    download_url: str = Field(..., description="Relative API URL to download or preview the file")

    model_config = ConfigDict(from_attributes=True)
