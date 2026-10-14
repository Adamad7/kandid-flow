"""Application runtime settings API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models.settings import AppSettings
from app.schemas.settings import AppSettingsRead, AppSettingsUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get(
    "",
    response_model=AppSettingsRead,
    summary="Get application runtime settings",
)
async def get_settings(
    db: AsyncSession = Depends(get_db_session),
) -> AppSettingsRead:
    """Fetch current runtime settings (non-secret configuration)."""
    stmt = select(AppSettings).where(AppSettings.id == 1)
    result = await db.execute(stmt)
    app_setting = result.scalar_one_or_none()

    if not app_setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application settings not found",
        )

    return AppSettingsRead.model_validate(app_setting)


@router.put(
    "",
    response_model=AppSettingsRead,
    summary="Update application runtime settings",
)
@router.patch(
    "",
    response_model=AppSettingsRead,
    summary="Partially update application runtime settings",
)
async def update_settings(
    update_data: AppSettingsUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> AppSettingsRead:
    """Update runtime settings (LLM auto parse mode, Ollama and cloud model options)."""
    stmt = select(AppSettings).where(AppSettings.id == 1)
    result = await db.execute(stmt)
    app_setting = result.scalar_one_or_none()

    if not app_setting:
        app_setting = AppSettings(
            id=1,
            auto_parse_mode=update_data.auto_parse_mode or "auto_ollama_fallback_api",
            ollama_base_url=update_data.ollama_base_url or "http://host.docker.internal:11434",
            ollama_model=update_data.ollama_model or "qwen2.5:14b",
            api_provider=update_data.api_provider or "gemini",
            api_model=update_data.api_model or "gemini-2.5-flash",
        )
        db.add(app_setting)
    else:
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(app_setting, field, value)

    await db.commit()
    await db.refresh(app_setting)
    logger.info(
        "Updated application settings (mode=%s, provider=%s)",
        app_setting.auto_parse_mode,
        app_setting.api_provider,
    )
    return AppSettingsRead.model_validate(app_setting)
