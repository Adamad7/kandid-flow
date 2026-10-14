"""Job Offers API endpoints for Pipeline and Kanban tracking."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models.job import JobOffer
from app.schemas.job import (
    JobLanguageType,
    JobOfferRead,
    JobOfferUpdate,
    JobPortalType,
    JobStatusType,
    WorkModelType,
)
from app.services.job_parser import reparse_job_by_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get(
    "",
    response_model=list[JobOfferRead],
    summary="List job offers with optional pipeline filters",
)
async def list_jobs(
    status_filter: JobStatusType | None = Query(default=None, alias="status"),
    work_model: WorkModelType | None = Query(default=None),
    source_portal: JobPortalType | None = Query(default=None),
    language: JobLanguageType | None = Query(default=None),
    salary_min: int | None = Query(default=None),
    salary_max: int | None = Query(default=None),
    search: str | None = Query(default=None, description="Search term for company or role title"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> list[JobOfferRead]:
    """Retrieve tracked job offers filtered by status, work model, or salary."""
    stmt = select(JobOffer).order_by(JobOffer.created_at.desc())

    if status_filter:
        stmt = stmt.where(JobOffer.status == status_filter)
    if work_model:
        stmt = stmt.where(JobOffer.work_model == work_model)
    if source_portal:
        stmt = stmt.where(JobOffer.source_portal == source_portal)
    if language:
        stmt = stmt.where(JobOffer.language == language)
    if salary_min is not None:
        stmt = stmt.where(JobOffer.salary_min >= salary_min)
    if salary_max is not None:
        stmt = stmt.where(JobOffer.salary_max <= salary_max)
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                JobOffer.company_name.ilike(search_pattern),
                JobOffer.role_title.ilike(search_pattern),
            )
        )

    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [JobOfferRead.model_validate(rec) for rec in records]


@router.get(
    "/{job_id}",
    response_model=JobOfferRead,
    summary="Get single job offer by UUID",
)
async def get_job_by_id(
    job_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> JobOfferRead:
    """Fetch complete details of a specific job offer."""
    stmt = select(JobOffer).where(JobOffer.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job offer with ID '{job_id}' not found",
        )

    return JobOfferRead.model_validate(job)


@router.patch(
    "/{job_id}",
    response_model=JobOfferRead,
    summary="Update job offer status or details",
)
async def update_job_by_id(
    job_id: UUID,
    update_data: JobOfferUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> JobOfferRead:
    """Update fields on an existing job offer (e.g. stage transition in Kanban)."""
    stmt = select(JobOffer).where(JobOffer.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job offer with ID '{job_id}' not found",
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(job, field, value)

    await db.commit()
    await db.refresh(job)
    return JobOfferRead.model_validate(job)


@router.post(
    "/{job_id}/reparse",
    response_model=JobOfferRead,
    summary="Trigger manual re-parsing of a job offer",
)
async def reparse_job(
    job_id: UUID,
    mode: str = Query("ai", description="Parsing strategy: 'ai' for LLM, 'traditional' for heuristic"),
    db: AsyncSession = Depends(get_db_session),
) -> JobOfferRead:
    """Manually invoke LLM or traditional heuristic parsing on an offer."""
    try:
        job = await reparse_job_by_id(job_id, db, mode=mode)
        return JobOfferRead.model_validate(job)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(err),
        ) from err


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a job offer",
)
async def delete_job_by_id(
    job_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """Permanently delete a tracked job offer and cascading events/CV versions."""
    stmt = select(JobOffer).where(JobOffer.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job offer with ID '{job_id}' not found",
        )

    await db.delete(job)
    await db.commit()
