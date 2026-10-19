"""Inbox ingestion endpoint for Chrome extension."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db_session
from app.models.job import JobOffer
from app.schemas.inbox import ExtractedJobPayload, InboxCheckResponse, InboxResponse
from app.schemas.realtime import RealtimeEventPayload
from app.services.events_broadcaster import events_broadcaster
from app.services.job_parser import canonicalize_url

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inbox", tags=["Inbox"])


async def verify_extension_token(
    authorization: Annotated[str | None, Header()] = None,
    x_api_token: Annotated[str | None, Header(alias="X-API-Token")] = None,
) -> None:
    """Validate extension token against environment settings.

    Reads from Authorization: Bearer <token> or X-API-Token header.
    """
    provided_token: str | None = None

    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            provided_token = parts[1]
        elif len(parts) == 1:
            provided_token = parts[0]
    elif x_api_token:
        provided_token = x_api_token

    if not provided_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing extension authentication token in Authorization or X-API-Token header",
        )

    expected_token = settings.EXTENSION_API_TOKEN

    if provided_token != expected_token:
        logger.warning("Rejected extension request due to invalid API token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid extension API token",
        )


@router.get(
    "/check",
    response_model=InboxCheckResponse,
    summary="Check if a job posting URL has already been captured",
)
async def check_duplicate_url(
    url: str = Query(..., description="Target job posting URL to verify for duplicates"),
    _: None = Depends(verify_extension_token),
    db: AsyncSession = Depends(get_db_session),
) -> InboxCheckResponse:
    """Canonicalize given URL and check if an active record already exists in job_offers."""
    canonical_url = canonicalize_url(url)
    stmt = select(JobOffer).where(JobOffer.source_url == canonical_url)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if job:
        return InboxCheckResponse(
            exists=True,
            job_id=job.id,
            status=job.status,
            role_title=job.role_title,
            company_name=job.company_name,
        )

    return InboxCheckResponse(
        exists=False,
        job_id=None,
        status=None,
        role_title=None,
        company_name=None,
    )


@router.post(
    "",
    response_model=InboxResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest job posting from browser extension",
)
async def ingest_job_offer(
    payload: ExtractedJobPayload,
    _: None = Depends(verify_extension_token),
    db: AsyncSession = Depends(get_db_session),
) -> InboxResponse:
    """Ingest a parsed job offer from the Chrome extension and queue it in inbox status."""
    canonical_url = canonicalize_url(payload.source_url)

    # Check for existing offer by canonical URL
    stmt = select(JobOffer).where(JobOffer.source_url == canonical_url)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    raw_dict = payload.model_dump(mode="json")
    raw_dict["source_url"] = canonical_url

    if existing:
        logger.info(
            "Job offer already exists for URL %s, updating with fresh extracted data",
            canonical_url,
        )
        if payload.application_deadline is not None:
            existing.application_deadline = payload.application_deadline
        if payload.salary_min is not None:
            existing.salary_min = payload.salary_min
        if payload.salary_max is not None:
            existing.salary_max = payload.salary_max
        if payload.salary_currency:
            existing.salary_currency = payload.salary_currency
        if payload.locations:
            existing.locations = payload.locations
        if payload.location_raw:
            existing.location_raw = payload.location_raw
        if payload.work_model:
            existing.work_model = payload.work_model
        if payload.work_model_details:
            existing.work_model_details = payload.work_model_details
        if payload.company and not existing.company_name:
            existing.company_name = payload.company
        if payload.title and not existing.role_title:
            existing.role_title = payload.title
        if payload.notes:
            existing.notes = payload.notes
        existing.raw_payload = raw_dict
        await db.commit()
        await db.refresh(existing)
        await events_broadcaster.broadcast(
            "job_updated",
            RealtimeEventPayload(
                job_id=existing.id,
                role_title=existing.role_title,
                company_name=existing.company_name,
                status=existing.status,
                message="Oferta została zaktualizowana w bazie",
            ),
        )
        return InboxResponse(
            id=existing.id,
            status=existing.status,
            message="Oferta została zaktualizowana w bazie",
            created_at=existing.created_at,
        )

    job_offer = JobOffer(
        source_url=canonical_url,
        source_portal=payload.source_portal,
        company_name=payload.company,
        role_title=payload.title,
        status="inbox",
        language="pl",  # Default pipeline language
        work_model=payload.work_model,
        work_model_details=payload.work_model_details,
        locations=payload.locations,
        location_raw=payload.location_raw,
        application_deadline=payload.application_deadline,
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        salary_currency=payload.salary_currency or "PLN",
        raw_payload=raw_dict,
        notes=payload.notes,
    )

    db.add(job_offer)
    await db.commit()
    await db.refresh(job_offer)

    logger.info("Successfully ingested job offer %s from %s", job_offer.id, payload.source_portal)
    await events_broadcaster.broadcast(
        "job_created",
        RealtimeEventPayload(
            job_id=job_offer.id,
            role_title=job_offer.role_title,
            company_name=job_offer.company_name,
            status=job_offer.status,
            message="Nowa oferta została zarejestrowana",
        ),
    )

    return InboxResponse(
        id=job_offer.id,
        status=job_offer.status,
        message="Offer received and queued for processing",
        created_at=job_offer.created_at,
    )
