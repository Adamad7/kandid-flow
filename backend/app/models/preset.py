"""SQLAlchemy model for Base CV Presets (Archetypes)."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, String, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.cv import CVVersion


class BaseCVPreset(Base):
    """Base CV Preset representing a pre-crafted role archetype baseline."""

    __tablename__ = "base_cv_presets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    language: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="pl",
        server_default=text("'pl'"),
    )
    layout_schema: Mapped[list[dict[str, Any]] | dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
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
    cv_versions: Mapped[list["CVVersion"]] = relationship(
        "CVVersion",
        back_populates="parent_preset",
    )
