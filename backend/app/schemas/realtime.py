"""Pydantic v2 schemas for real-time Server-Sent Events (SSE) streaming."""

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

RealtimeEventType = Literal[
    "job_created",
    "job_updated",
    "job_deleted",
    "recruitment_event_created",
    "recruitment_event_updated",
    "recruitment_event_deleted",
    "ping",
]


class RealtimeEventPayload(BaseModel):
    """Payload data associated with a real-time event."""

    job_id: UUID | None = None
    event_id: UUID | None = None
    role_title: str | None = None
    company_name: str | None = None
    status: str | None = None
    message: str | None = None


class RealtimeEvent(BaseModel):
    """Standardized real-time event envelope transmitted over SSE."""

    event: RealtimeEventType
    payload: RealtimeEventPayload = Field(default_factory=RealtimeEventPayload)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
