"""Pydantic schemas for Recruitment Events and Pipeline Stages."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

EventType = Literal[
    "hr_screening",
    "technical_interview",
    "task_deadline",
    "manager_interview",
    "other",
]


class RecruitmentEventBase(BaseModel):
    """Base attributes for recruitment events."""

    job_offer_id: UUID = Field(..., description="ID of the associated job offer")
    event_type: EventType = Field(..., description="Type of recruitment stage or milestone")
    title: str = Field(..., description="Human-readable title of the event")
    scheduled_at: datetime = Field(
        ..., description="Exact date and time when the event is scheduled"
    )
    duration_minutes: int | None = Field(default=60, description="Estimated duration in minutes")
    location_or_link: str | None = Field(
        default=None, description="Meeting link (Meet/Teams) or physical office address"
    )
    interviewers: str | None = Field(
        default=None, description="Names and roles of recruitment team members"
    )
    notes: str | None = Field(
        default=None, description="Preparation notes, questions, or post-interview feedback"
    )
    is_completed: bool = Field(
        default=False, description="Flag indicating if the stage is concluded"
    )


class RecruitmentEventCreate(RecruitmentEventBase):
    """Schema for scheduling a new recruitment event."""

    pass


class RecruitmentEventUpdate(BaseModel):
    """Schema for modifying a scheduled recruitment event."""

    event_type: EventType | None = None
    title: str | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    location_or_link: str | None = None
    interviewers: str | None = None
    notes: str | None = None
    is_completed: bool | None = None


class RecruitmentEventRead(RecruitmentEventBase):
    """Schema for returning recruitment event details."""

    id: UUID = Field(..., description="Unique event identifier")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")

    model_config = ConfigDict(from_attributes=True)
