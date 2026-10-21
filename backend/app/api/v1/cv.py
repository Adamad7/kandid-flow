"""CV generation, versioning, live preview, and export endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models.candidate import CandidateProfile
from app.models.cv import CVVersion
from app.schemas.candidate import CandidateContactInfo, CandidateSectionBlock
from app.schemas.cv import (
    CVGenerateRequest,
    CVLayoutSchema,
    CVPreviewRequest,
    CVPreviewResponse,
    CVRefineBlockRequest,
    CVRefineBlockResponse,
    CVVersionRead,
    CVVersionUpdate,
)
from app.services.cv_generator import cv_generator
from app.services.typst_compiler import TypstCompilationError, typst_compiler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cv", tags=["CV"])


async def _resolve_cv_data(
    request: CVPreviewRequest,
    db: AsyncSession,
) -> CVLayoutSchema:
    """Assemble normalized CVLayoutSchema payload for Typst compiler."""
    # Query candidate profile if available
    stmt = select(CandidateProfile).limit(1)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    candidate_name = candidate.full_name if candidate else "Jan Kowalski"
    contact_info = (
        CandidateContactInfo.model_validate(candidate.contact_info)
        if candidate and candidate.contact_info
        else CandidateContactInfo()
    )

    # Handle explicit layout schema if supplied
    if request.layout_schema:
        layout = request.layout_schema
        if not layout.full_name:
            layout.full_name = candidate_name
        if not layout.contact_info:
            layout.contact_info = contact_info
        if not layout.language:
            layout.language = request.language
        return layout

    # Otherwise construct from candidate profile knowledge base
    active_sections: list[CandidateSectionBlock] = []
    if candidate and candidate.sections:
        for sec in candidate.sections:
            sec_dict = sec if isinstance(sec, dict) else sec.model_dump(mode="json")
            sec_id = sec_dict.get("id") or sec_dict.get("type")
            if not request.sections or (sec_id in request.sections):
                active_sections.append(sec)

    return CVLayoutSchema(
        full_name=candidate_name,
        contact_info=contact_info,
        language=request.language,
        sections=active_sections,
    )


@router.post(
    "/preview",
    response_model=CVPreviewResponse,
    summary="Generate real-time multi-page vector SVG preview of CV",
)
async def preview_cv(
    request: CVPreviewRequest,
    db: AsyncSession = Depends(get_db_session),
) -> CVPreviewResponse:
    """Compile CV sections into vector SVG strings (one per page) for live web preview."""
    cv_data = await _resolve_cv_data(request, db)

    try:
        svg_pages = typst_compiler.compile_to_svg(cv_data)
        return CVPreviewResponse(
            svg_pages=svg_pages,
            svg_content="\n".join(svg_pages),
            version_id=None,
        )
    except TypstCompilationError as err:
        logger.error("Typst preview compilation failed: %s", err)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Typst compilation failed: {err.message}",
        ) from err


@router.post(
    "/export-pdf",
    response_class=Response,
    summary="Compile and download binary PDF resume",
)
async def export_cv_pdf(
    request: CVPreviewRequest,
    db: AsyncSession = Depends(get_db_session),
) -> Response:
    """Compile CV into binary PDF document for direct download."""
    cv_data = await _resolve_cv_data(request, db)

    try:
        pdf_bytes = typst_compiler.compile_to_pdf(cv_data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="cv.pdf"'},
        )
    except TypstCompilationError as err:
        logger.error("Typst PDF export failed: %s", err)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Typst PDF compilation failed: {err.message}",
        ) from err


@router.post(
    "/generate",
    response_model=CVVersionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a tailored CV version using preset or profile baseline",
)
async def generate_cv(
    request: CVGenerateRequest,
    db: AsyncSession = Depends(get_db_session),
) -> CVVersionRead:
    """Synthesize job-tailored CV version from preset or candidate profile and persist it."""
    cv_version = await cv_generator.generate_tailored_cv(request, db)
    return CVVersionRead.model_validate(cv_version)


@router.get(
    "/versions/{job_offer_id}",
    response_model=list[CVVersionRead],
    summary="Get all CV versions for a specific job offer",
)
async def get_cv_versions(
    job_offer_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> list[CVVersionRead]:
    """Retrieve all tailored CV versions for a job offer ordered by version number."""
    stmt = (
        select(CVVersion)
        .where(CVVersion.job_offer_id == job_offer_id)
        .order_by(CVVersion.version_number.desc())
    )
    result = await db.execute(stmt)
    versions = result.scalars().all()
    return [CVVersionRead.model_validate(v) for v in versions]


@router.get(
    "/{cv_version_id}",
    response_model=CVVersionRead,
    summary="Get a specific CV version by ID",
)
async def get_cv_version_by_id(
    cv_version_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> CVVersionRead:
    """Retrieve a single CV version by unique identifier."""
    stmt = select(CVVersion).where(CVVersion.id == cv_version_id)
    result = await db.execute(stmt)
    version = result.scalar_one_or_none()

    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CV version with ID '{cv_version_id}' not found",
        )

    return CVVersionRead.model_validate(version)


@router.patch(
    "/{cv_version_id}",
    response_model=CVVersionRead,
    summary="Update an existing CV version",
)
async def update_cv_version(
    cv_version_id: UUID,
    update_data: CVVersionUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> CVVersionRead:
    """Modify content blocks or active state of an existing CV version."""
    stmt = select(CVVersion).where(CVVersion.id == cv_version_id)
    result = await db.execute(stmt)
    version = result.scalar_one_or_none()

    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CV version with ID '{cv_version_id}' not found",
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if field == "layout_schema" and hasattr(value, "model_dump"):
            value = value.model_dump(mode="json")
        setattr(version, field, value)

    await db.commit()
    await db.refresh(version)
    return CVVersionRead.model_validate(version)


@router.post(
    "/{cv_version_id}/refine-block",
    response_model=CVRefineBlockResponse,
    summary="Inline AI refinement of a single CV section block",
)
async def refine_cv_block(
    cv_version_id: UUID,
    payload: CVRefineBlockRequest,
    db: AsyncSession = Depends(get_db_session),
) -> CVRefineBlockResponse:
    """Apply inline AI refinement prompt to a specific block and commit changes."""
    refined_raw, updated_version = await cv_generator.refine_block(
        cv_version_id=cv_version_id,
        block_id=payload.block_id,
        instruction=payload.instruction,
        db=db,
        current_block=payload.current_block,
        llm_provider=payload.llm_provider,
        llm_model=payload.llm_model,
        enable_thinking=payload.enable_thinking,
    )

    return CVRefineBlockResponse(
        block_id=payload.block_id,
        refined_block=refined_raw,
        version=CVVersionRead.model_validate(updated_version),
    )
