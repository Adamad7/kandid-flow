"""Candidate Profile knowledge base API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models.candidate import CandidateProfile
from app.schemas.candidate import (
    CandidateAIFillRequest,
    CandidateProfileRead,
    CandidateProfileUpdate,
)
from app.services.candidate_parser import candidate_parser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/candidate", tags=["Candidate"])


@router.get(
    "",
    response_model=CandidateProfileRead,
    summary="Get candidate profile knowledge base",
)
async def get_candidate_profile(
    db: AsyncSession = Depends(get_db_session),
) -> CandidateProfileRead:
    """Fetch singleton candidate profile knowledge base."""
    stmt = select(CandidateProfile).limit(1)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile has not been initialized yet",
        )

    return CandidateProfileRead.model_validate(candidate)


@router.put(
    "",
    response_model=CandidateProfileRead,
    summary="Update candidate profile knowledge base",
)
async def update_candidate_profile(
    update_data: CandidateProfileUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> CandidateProfileRead:
    """Update candidate profile knowledge base blocks or contact details."""
    stmt = select(CandidateProfile).limit(1)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    contact_dict = (
        update_data.contact_info.model_dump(mode="json") if update_data.contact_info else {}
    )
    sections_list = [
        s.model_dump(mode="json") if hasattr(s, "model_dump") else s
        for s in (update_data.sections or [])
    ]

    if not candidate:
        candidate = CandidateProfile(
            full_name=update_data.full_name or "Jan Kowalski",
            contact_info=contact_dict,
            sections=sections_list,
            default_sections=update_data.default_sections
            or [
                "summary",
                "skills",
                "experience",
                "projects",
                "education",
            ],
        )
        db.add(candidate)
    else:
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if field == "contact_info" and hasattr(value, "model_dump"):
                value = value.model_dump(mode="json")
            elif field == "sections" and isinstance(value, list):
                value = [
                    s.model_dump(mode="json") if hasattr(s, "model_dump") else s for s in value
                ]
            setattr(candidate, field, value)

    await db.commit()
    await db.refresh(candidate)
    return CandidateProfileRead.model_validate(candidate)


@router.post(
    "/reset-default",
    response_model=CandidateProfileRead,
    summary="Reset candidate profile to baseline default data",
)
async def reset_candidate_profile_to_default(
    db: AsyncSession = Depends(get_db_session),
) -> CandidateProfileRead:
    """Reset candidate profile knowledge base to default benchmark data (Jan Kowalski)."""
    candidate = await candidate_parser.reset_to_default(db)
    return CandidateProfileRead.model_validate(candidate)


@router.post(
    "/ai-fill",
    response_model=CandidateProfileRead,
    summary="Fill candidate profile knowledge base using AI parsing",
)
async def ai_fill_candidate_profile(
    request: CandidateAIFillRequest,
    db: AsyncSession = Depends(get_db_session),
) -> CandidateProfileRead:
    """Extract candidate profile details from raw text and merge or replace knowledge base."""
    try:
        candidate = await candidate_parser.parse_and_apply(request, db)
        return CandidateProfileRead.model_validate(candidate)
    except Exception as exc:
        logger.error("AI fill failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Błąd podczas przetwarzania profilu przez AI: {exc}",
        ) from exc
