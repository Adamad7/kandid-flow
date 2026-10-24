"""FastAPI endpoints for Recruitment Analytics."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.schemas.analytics import AnalyticsOverviewResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
    summary="Get consolidated recruitment pipeline metrics",
)
async def get_analytics_overview(
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsOverviewResponse:
    """Compute and return metrics on response rate, funnel, and stale applications."""
    return await AnalyticsService.get_overview(session)
