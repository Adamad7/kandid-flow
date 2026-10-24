"""Recruitment Events and Interview Stages API endpoints."""

import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db_session
from app.models.event import RecruitmentEvent
from app.models.job import JobOffer
from app.schemas.event import (
    EventType,
    RecruitmentEventCreate,
    RecruitmentEventRead,
    RecruitmentEventUpdate,
)
from app.schemas.realtime import RealtimeEventPayload
from app.services.events_broadcaster import events_broadcaster

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
    stmt = (
        select(RecruitmentEvent)
        .options(selectinload(RecruitmentEvent.attachments))
        .order_by(RecruitmentEvent.scheduled_at.asc())
    )

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
    job = res_job.scalar_one_or_none()
    if not job:
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

    # Sync with job.applied_at if application_submitted
    if payload.event_type == "application_submitted":
        job.applied_at = payload.scheduled_at
        if job.status in ("inbox", "ready"):
            job.status = "applied"

    await db.commit()

    # Re-fetch event with attachments eagerly loaded
    stmt_ev = (
        select(RecruitmentEvent)
        .options(selectinload(RecruitmentEvent.attachments))
        .where(RecruitmentEvent.id == event.id)
    )
    res_ev = await db.execute(stmt_ev)
    loaded_event = res_ev.scalar_one()

    logger.info(
        "Created recruitment event '%s' (%s) for job %s",
        loaded_event.title,
        loaded_event.id,
        loaded_event.job_offer_id,
    )
    await events_broadcaster.broadcast(
        "recruitment_event_created",
        RealtimeEventPayload(
            event_id=loaded_event.id,
            job_id=loaded_event.job_offer_id,
            message=f"Zaplanowano zdarzenie: {loaded_event.title}",
        ),
    )
    return RecruitmentEventRead.model_validate(loaded_event)


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
    stmt = (
        select(RecruitmentEvent)
        .options(selectinload(RecruitmentEvent.attachments))
        .where(RecruitmentEvent.id == event_id)
    )
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
    stmt = (
        select(RecruitmentEvent)
        .options(selectinload(RecruitmentEvent.attachments))
        .where(RecruitmentEvent.id == event_id)
    )
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

    # If this is an application_submitted event and scheduled_at changed, synchronize job.applied_at
    if event.event_type == "application_submitted" and "scheduled_at" in update_dict:
        stmt_job = select(JobOffer).where(JobOffer.id == event.job_offer_id)
        res_job = await db.execute(stmt_job)
        job = res_job.scalar_one_or_none()
        if job:
            job.applied_at = event.scheduled_at

    await db.commit()

    # Re-fetch event with attachments
    stmt_ref = (
        select(RecruitmentEvent)
        .options(selectinload(RecruitmentEvent.attachments))
        .where(RecruitmentEvent.id == event.id)
    )
    res_ref = await db.execute(stmt_ref)
    loaded_event = res_ref.scalar_one()

    await events_broadcaster.broadcast(
        "recruitment_event_updated",
        RealtimeEventPayload(
            event_id=loaded_event.id,
            job_id=loaded_event.job_offer_id,
            message=f"Zaktualizowano zdarzenie: {loaded_event.title}",
        ),
    )
    return RecruitmentEventRead.model_validate(loaded_event)


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

    deleted_event_id = event.id
    deleted_job_id = event.job_offer_id
    was_application_event = event.event_type == "application_submitted"

    await db.delete(event)

    if was_application_event:
        # Check if another application event exists for this job
        stmt_other = (
            select(RecruitmentEvent)
            .where(
                RecruitmentEvent.job_offer_id == deleted_job_id,
                RecruitmentEvent.id != deleted_event_id,
                RecruitmentEvent.event_type == "application_submitted",
            )
            .order_by(RecruitmentEvent.scheduled_at.desc())
        )
        res_other = await db.execute(stmt_other)
        other_event = res_other.scalar_one_or_none()

        stmt_job = select(JobOffer).where(JobOffer.id == deleted_job_id)
        res_job = await db.execute(stmt_job)
        job = res_job.scalar_one_or_none()
        if job:
            job.applied_at = other_event.scheduled_at if other_event else None

    await db.commit()
    logger.info("Deleted recruitment event %s", event_id)
    await events_broadcaster.broadcast(
        "recruitment_event_deleted",
        RealtimeEventPayload(
            event_id=deleted_event_id,
            job_id=deleted_job_id,
            message="Usunięto zdarzenie rekrutacyjne",
        ),
    )
