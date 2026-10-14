"""Recruitment Events and Interview Stages API endpoints."""

import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models.event import RecruitmentEvent
from app.models.job import JobOffer
from app.schemas.event import (
    EventType,
    RecruitmentEventCreate,
    RecruitmentEventRead,
    RecruitmentEventUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Events"])


@router.get(
    "",
    response_model=list[RecruitmentEventRead],
    summary="List recruitment events and scheduled stages",
)
async def list_events(
    job_offer_id: UUID | None = Query(
        default=None, description="Filter events for specific job offer"
    ),
    event_type: EventType | None = Query(default=None, description="Filter by event type"),
    is_completed: bool | None = Query(default=None, description="Filter by completion status"),
    upcoming_only: bool = Query(
        default=False, description="Filter only upcoming events from now onwards"
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> list[RecruitmentEventRead]:
    """Retrieve recruitment pipeline events (interviews, tests, deadlines)."""
    stmt = select(RecruitmentEvent).order_by(RecruitmentEvent.scheduled_at.asc())

    if job_offer_id:
        stmt = stmt.where(RecruitmentEvent.job_offer_id == job_offer_id)
    if event_type:
        stmt = stmt.where(RecruitmentEvent.event_type == event_type)
    if is_completed is not None:
        stmt = stmt.where(RecruitmentEvent.is_completed == is_completed)
    if upcoming_only:
        now = datetime.now(UTC)
        stmt = stmt.where(RecruitmentEvent.scheduled_at >= now)

    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [RecruitmentEventRead.model_validate(r) for r in records]


@router.post(
    "",
    response_model=RecruitmentEventRead,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a new recruitment event",
)
async def create_event(
    payload: RecruitmentEventCreate,
    db: AsyncSession = Depends(get_db_session),
) -> RecruitmentEventRead:
    """Schedule a new recruitment stage tied to a valid job offer."""
    # Verify that the parent job offer exists
    stmt_job = select(JobOffer).where(JobOffer.id == payload.job_offer_id)
    res_job = await db.execute(stmt_job)
    if not res_job.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Associated job offer '{payload.job_offer_id}' not found",
        )

    event = RecruitmentEvent(
        job_offer_id=payload.job_offer_id,
        event_type=payload.event_type,
        title=payload.title,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes or 60,
        location_or_link=payload.location_or_link,
        interviewers=payload.interviewers,
        notes=payload.notes,
        is_completed=payload.is_completed,
    )

    db.add(event)
    await db.commit()
    await db.refresh(event)

    logger.info(
        "Created recruitment event '%s' (%s) for job %s",
        event.title,
        event.id,
        event.job_offer_id,
    )
    return RecruitmentEventRead.model_validate(event)


@router.get(
    "/{event_id}",
    response_model=RecruitmentEventRead,
    summary="Get single recruitment event by ID",
)
async def get_event_by_id(
    event_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> RecruitmentEventRead:
    """Fetch details of a specific recruitment event."""
    stmt = select(RecruitmentEvent).where(RecruitmentEvent.id == event_id)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recruitment event with ID '{event_id}' not found",
        )

    return RecruitmentEventRead.model_validate(event)


@router.patch(
    "/{event_id}",
    response_model=RecruitmentEventRead,
    summary="Update a recruitment event",
)
async def update_event(
    event_id: UUID,
    update_data: RecruitmentEventUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> RecruitmentEventRead:
    """Update details or completion flag of a scheduled recruitment event."""
    stmt = select(RecruitmentEvent).where(RecruitmentEvent.id == event_id)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recruitment event with ID '{event_id}' not found",
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    return RecruitmentEventRead.model_validate(event)


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a recruitment event",
)
async def delete_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """Delete a recruitment event."""
    stmt = select(RecruitmentEvent).where(RecruitmentEvent.id == event_id)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recruitment event with ID '{event_id}' not found",
        )

    await db.delete(event)
    await db.commit()
    logger.info("Deleted recruitment event %s", event_id)
