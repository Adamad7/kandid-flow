"""Pydantic schemas for Recruitment Analytics and Pipeline Metrics."""

from pydantic import BaseModel, ConfigDict, Field


class RecruitmentFunnelStage(BaseModel):
    """Single stage in the recruitment funnel."""

    stage: str = Field(..., description="Stage identifier (inbox, ready, applied, etc.)")
    label: str = Field(..., description="Localized human-readable label")
    count: int = Field(..., description="Number of offers currently in or reached this stage")
    percentage: float = Field(..., description="Percentage relative to all tracked offers")


class PortalPerformanceMetric(BaseModel):
    """Performance breakdown for a single recruitment portal."""

    portal: str = Field(..., description="Portal identifier (e.g. justjoin, pracuj, linkedin)")
    label: str = Field(..., description="Localized human-readable portal label")
    total_offers: int = Field(..., description="Total offers imported from this portal")
    applied_count: int = Field(..., description="Offers where application was submitted")
    interview_count: int = Field(..., description="Offers that reached interview stage")
    offer_count: int = Field(..., description="Offers that resulted in a job offer")
    response_rate: float = Field(
        ..., description="Percentage of applications that resulted in interviews or offers"
    )


class WorkModelMetric(BaseModel):
    """Breakdown by work model."""

    work_model: str = Field(..., description="Work model identifier (remote, hybrid, onsite)")
    label: str = Field(..., description="Localized human-readable label")
    count: int = Field(..., description="Number of offers in this work model")
    percentage: float = Field(..., description="Percentage relative to total offers")


class StaleApplicationAlert(BaseModel):
    """Job offer awaiting response for an extended period."""

    job_id: str = Field(..., description="ID of the job offer")
    role_title: str = Field(..., description="Position title")
    company_name: str = Field(..., description="Company name")
    applied_at: str = Field(..., description="Formatted application date")
    days_waiting: int = Field(..., description="Number of days since application was sent")
    is_ghosting_risk: bool = Field(..., description="Flag if waiting over 14 days without event")


class AnalyticsOverviewResponse(BaseModel):
    """Consolidated recruitment metrics and analytics overview."""

    total_offers: int = Field(..., description="Total number of offers tracked across all statuses")
    inbox_count: int = Field(..., description="Offers waiting in inbox")
    ready_count: int = Field(..., description="Offers prepared and ready for application")
    applied_count: int = Field(..., description="Offers with applications submitted")
    interview_count: int = Field(..., description="Offers in interview stage")
    offer_count: int = Field(..., description="Job offers received")
    rejected_count: int = Field(..., description="Offers rejected or closed")
    archived_count: int = Field(..., description="Liczba ofert przeniesionych do archiwum")
    overall_response_rate: float = Field(
        ..., description="Percentage of applied offers that reached interviews or offers"
    )
    average_response_days: float | None = Field(
        default=None, description="Average days from applied_at to first scheduled interview"
    )
    ghosting_alert_count: int = Field(
        ..., description="Count of applications without updates for > 14 days"
    )
    funnel: list[RecruitmentFunnelStage] = Field(
        default_factory=list, description="Recruitment pipeline funnel stages"
    )
    portals: list[PortalPerformanceMetric] = Field(
        default_factory=list, description="Performance metrics by job portal"
    )
    work_models: list[WorkModelMetric] = Field(
        default_factory=list, description="Distribution by work model"
    )
    stale_applications: list[StaleApplicationAlert] = Field(
        default_factory=list, description="Offers needing attention or follow-up"
    )

    model_config = ConfigDict(from_attributes=True)
