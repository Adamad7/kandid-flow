"""SQLAlchemy model for Job Offers."""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, DateTime, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.attachment import JobAttachment
    from app.models.cv import CVVersion
    from app.models.event import RecruitmentEvent


class JobOffer(Base):
    """Job offer entity representing ingested and tracked recruitment vacancies."""

    __tablename__ = "job_offers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    source_url: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    source_portal: Mapped[str] = mapped_column(
        String(50), nullable=False, default="generic", server_default="generic"
    )
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="inbox", server_default="inbox"
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(
        String(10), nullable=False, default="pl", server_default="pl"
    )
    work_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    work_model_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    locations: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        default=list,
        server_default=text("'{}'::text[]"),
    )
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        default=list,
        server_default=text("'{}'::text[]"),
    )
    location_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    application_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_currency: Mapped[str | None] = mapped_column(
        String(10), nullable=True, default="PLN", server_default="PLN"
    )
    contract_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    raw_payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    structured_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    events: Mapped[list["RecruitmentEvent"]] = relationship(
        "RecruitmentEvent",
        back_populates="job_offer",
        cascade="all, delete-orphan",
        order_by="RecruitmentEvent.scheduled_at",
    )
    cv_versions: Mapped[list["CVVersion"]] = relationship(
        "CVVersion",
        back_populates="job_offer",
        cascade="all, delete-orphan",
        order_by="CVVersion.version_number.desc()",
    )
    attachments: Mapped[list["JobAttachment"]] = relationship(
        "JobAttachment",
        back_populates="job_offer",
        cascade="all, delete-orphan",
        order_by="JobAttachment.created_at.desc()",
    )
