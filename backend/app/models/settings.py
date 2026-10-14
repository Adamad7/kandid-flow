"""SQLAlchemy model for Application Settings."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AppSettings(Base):
    """Global configuration settings entity persisted in database."""

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    auto_parse_mode: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="auto_ollama_fallback_api",
        server_default=text("'auto_ollama_fallback_api'"),
    )
    ollama_base_url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="http://host.docker.internal:11434",
        server_default=text("'http://host.docker.internal:11434'"),
    )
    ollama_model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="qwen2.5:14b",
        server_default=text("'qwen2.5:14b'"),
    )
    api_provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="gemini",
        server_default=text("'gemini'"),
    )
    api_model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="gemini-2.5-flash",
        server_default=text("'gemini-2.5-flash'"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
