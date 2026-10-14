"""Base CV Presets (Archetypes) API endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models.candidate import CandidateProfile
from app.models.preset import BaseCVPreset
from app.schemas.cv import CVPreviewResponse
from app.schemas.preset import (
    BaseCVPresetCreate,
    BaseCVPresetRead,
    BaseCVPresetUpdate,
)
from app.services.typst_compiler import TypstCompilationError, typst_compiler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/presets", tags=["Presets"])


@router.get(
    "",
    response_model=list[BaseCVPresetRead],
    summary="List all base CV presets",
)
async def list_presets(
    language: str | None = Query(default=None, description="Filter presets by language (pl/en)"),
    db: AsyncSession = Depends(get_db_session),
) -> list[BaseCVPresetRead]:
    """Retrieve all pre-crafted CV presets, optionally filtered by language."""
    stmt = select(BaseCVPreset).order_by(BaseCVPreset.created_at.desc())
    if language:
        stmt = stmt.where(BaseCVPreset.language == language)

    result = await db.execute(stmt)
    presets = result.scalars().all()
    return [BaseCVPresetRead.model_validate(p) for p in presets]


@router.post(
    "",
    response_model=BaseCVPresetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new base CV preset",
)
async def create_preset(
    payload: BaseCVPresetCreate,
    db: AsyncSession = Depends(get_db_session),
) -> BaseCVPresetRead:
    """Create a new archetype baseline CV preset."""
    layout_dict = (
        payload.layout_schema.model_dump(mode="json")
        if hasattr(payload.layout_schema, "model_dump")
        else payload.layout_schema
    )

    preset = BaseCVPreset(
        title=payload.title,
        language=payload.language,
        layout_schema=layout_dict,
    )
    db.add(preset)
    await db.commit()
    await db.refresh(preset)

    logger.info("Created base CV preset '%s' (%s)", preset.title, preset.id)
    return BaseCVPresetRead.model_validate(preset)


@router.get(
    "/{preset_id}",
    response_model=BaseCVPresetRead,
    summary="Get single base CV preset by UUID",
)
async def get_preset(
    preset_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> BaseCVPresetRead:
    """Fetch details of a specific base CV preset."""
    stmt = select(BaseCVPreset).where(BaseCVPreset.id == preset_id)
    result = await db.execute(stmt)
    preset = result.scalar_one_or_none()

    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Base CV preset with ID '{preset_id}' not found",
        )

    return BaseCVPresetRead.model_validate(preset)


@router.put(
    "/{preset_id}",
    response_model=BaseCVPresetRead,
    summary="Update existing base CV preset",
)
async def update_preset(
    preset_id: UUID,
    update_data: BaseCVPresetUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> BaseCVPresetRead:
    """Update fields on an existing archetype preset."""
    stmt = select(BaseCVPreset).where(BaseCVPreset.id == preset_id)
    result = await db.execute(stmt)
    preset = result.scalar_one_or_none()

    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Base CV preset with ID '{preset_id}' not found",
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if field == "layout_schema" and hasattr(value, "model_dump"):
            value = value.model_dump(mode="json")
        setattr(preset, field, value)

    await db.commit()
    await db.refresh(preset)
    logger.info("Updated base CV preset '%s' (%s)", preset.title, preset.id)
    return BaseCVPresetRead.model_validate(preset)


@router.delete(
    "/{preset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a base CV preset",
)
async def delete_preset(
    preset_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """Remove a base CV preset."""
    stmt = select(BaseCVPreset).where(BaseCVPreset.id == preset_id)
    result = await db.execute(stmt)
    preset = result.scalar_one_or_none()

    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Base CV preset with ID '{preset_id}' not found",
        )

    await db.delete(preset)
    await db.commit()
    logger.info("Deleted base CV preset '%s' (%s)", preset.title, preset_id)


@router.post(
    "/{preset_id}/preview",
    response_model=CVPreviewResponse,
    summary="Generate live multi-page vector SVG preview of preset",
)
async def preview_preset(
    preset_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> CVPreviewResponse:
    """Render Typst multi-page SVG preview for a role archetype preset."""
    stmt = select(BaseCVPreset).where(BaseCVPreset.id == preset_id)
    result = await db.execute(stmt)
    preset = result.scalar_one_or_none()

    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Base CV preset with ID '{preset_id}' not found",
        )

    # Get candidate contact info if present for realistic preview
    cand_stmt = select(CandidateProfile).limit(1)
    cand_res = await db.execute(cand_stmt)
    candidate = cand_res.scalar_one_or_none()

    cv_data = (
        dict(preset.layout_schema)
        if isinstance(preset.layout_schema, dict)
        else {"sections": preset.layout_schema}
    )
    if "full_name" not in cv_data:
        cv_data["full_name"] = candidate.full_name if candidate else "Jan Kowalski"
    if "contact_info" not in cv_data and candidate:
        cv_data["contact_info"] = candidate.contact_info
    if "language" not in cv_data:
        cv_data["language"] = preset.language

    try:
        svg_pages = typst_compiler.compile_to_svg(cv_data)
        return CVPreviewResponse(
            svg_pages=svg_pages,
            svg_content="\n".join(svg_pages),
            version_id=None,
        )
    except TypstCompilationError as err:
        logger.error("Typst preset preview compilation failed: %s", err)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Typst compilation failed: {err.message}",
        ) from err
