"""Pydantic schemas for AI follow-up message generation."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

FollowUpTone = Literal["polite_inquiry", "enthusiastic", "short_checkin"]
FollowUpPlatform = Literal["email", "linkedin"]


class FollowUpGenerateRequest(BaseModel):
    """Request payload for generating an AI follow-up message."""

    tone: FollowUpTone = Field(
        default="polite_inquiry",
        description="Tone: polite_inquiry, enthusiastic, or short_checkin",
    )
    platform: FollowUpPlatform = Field(
        default="linkedin",
        description="Target communication channel: email or LinkedIn",
    )
    custom_notes: str | None = Field(
        default=None,
        description="Optional additional context or instructions to incorporate",
    )


class FollowUpGenerateResponse(BaseModel):
    """Response containing generated follow-up message."""

    subject: str | None = Field(
        default=None, description="Recommended email subject line (null for LinkedIn message)"
    )
    content: str = Field(..., description="Drafted follow-up text ready to copy")
    generated_at: datetime = Field(..., description="Timestamp of generation")

    model_config = ConfigDict(from_attributes=True)
