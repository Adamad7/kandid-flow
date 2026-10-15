"""Pydantic schemas for Browser Extension inbox ingestion."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

SourcePortalType = Literal["justjoin", "pracuj", "nofluffjobs", "linkedin", "generic"]
WorkModelType = Literal["remote", "hybrid", "onsite"]


class ExtractorDiagnosticMetadata(BaseModel):
    """Diagnostic metadata emitted by browser extractors."""

    page_title: str | None = Field(default=None, description="HTML title of the posting page")
    extracted_at: str | None = Field(default=None, description="ISO timestamp of DOM extraction")
    extractor_version: str | None = Field(
        default=None, description="Version of the DOM extractor script"
    )
    raw_selectors: list[str] = Field(
        default_factory=list, description="CSS selectors that matched elements"
    )
    extra_info: str | None = Field(default=None, description="Additional diagnostic context")

    model_config = ConfigDict(extra="ignore")


class ExtractedJobPayload(BaseModel):
    """Payload sent by the Chrome extension when capturing a job offer."""

    source_url: str = Field(..., description="Canonical URL of the job posting")
    source_portal: SourcePortalType = Field(
        ..., description="Identifier of the portal extractor used"
    )
    title: str | None = Field(default=None, description="Job title / position name")
    company: str | None = Field(default=None, description="Hiring company name")
    location_raw: str | None = Field(
        default=None, description="Unmodified location string from the posting"
    )
    locations: list[str] = Field(
        default_factory=list, description="Normalized list of office cities"
    )
    work_model: WorkModelType | None = Field(
        default=None, description="Normalized work model: remote, hybrid, or onsite"
    )
    work_model_details: str | None = Field(
        default=None, description="Additional work model specifications (e.g. 2 days onsite/mo)"
    )
    salary_raw: str | None = Field(
        default=None, description="Raw compensation string as presented on the page"
    )
    salary_min: int | None = Field(default=None, description="Lower bound of salary range")
    salary_max: int | None = Field(default=None, description="Upper bound of salary range")
    salary_currency: str | None = Field(
        default="PLN", description="Currency symbol or code, defaults to PLN"
    )
    description_html: str | None = Field(
        default=None, description="Sanitized HTML snippet of the job description"
    )
    description_text: str = Field(
        default="", description="Clean plain text content of the job offer description"
    )
    requirements_raw: list[str] = Field(
        default_factory=list, description="Extracted requirement bullet points"
    )
    application_deadline: date | None = Field(
        default=None, description="Application submission deadline date"
    )
    notes: str | None = Field(
        default=None, description="Optional custom notes entered in the extension popup"
    )
    custom_metadata: ExtractorDiagnosticMetadata | None = Field(
        default=None, description="Extractor-specific diagnostic metadata"
    )

    @field_validator("application_deadline", mode="before")
    @classmethod
    def parse_deadline(cls, v: object) -> date | None:
        if not v:
            return None
        if isinstance(v, date) and not isinstance(v, datetime):
            return v
        if isinstance(v, datetime):
            return v.date()
        if isinstance(v, str):
            clean = v.split("T")[0].split(" ")[0].strip()
            if not clean:
                return None
            try:
                if "." in clean:
                    return datetime.strptime(clean, "%d.%m.%Y").date()
                if "-" in clean:
                    return datetime.strptime(clean, "%Y-%m-%d").date()
            except (ValueError, TypeError):
                return None
        return None

    model_config = ConfigDict(extra="ignore")


class InboxCheckResponse(BaseModel):
    """Response returned when querying whether an offer URL is already captured."""

    exists: bool = Field(
        ..., description="Whether the canonicalized URL already exists in database"
    )
    job_id: UUID | None = Field(default=None, description="ID of existing job offer if found")
    status: str | None = Field(default=None, description="Current pipeline status of the job offer")
    role_title: str | None = Field(default=None, description="Role title if already exists")
    company_name: str | None = Field(default=None, description="Company name if already exists")

    model_config = ConfigDict(from_attributes=True)


class InboxResponse(BaseModel):
    """Acknowledgement returned to the extension after queueing an offer."""

    id: UUID = Field(..., description="Unique UUID assigned to the created job offer")
    status: str = Field(
        default="inbox", description="Initial status of the job offer in the pipeline"
    )
    message: str = Field(
        default="Offer received and queued for processing",
        description="User-readable status message",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Timestamp of ingestion"
    )

    model_config = ConfigDict(from_attributes=True)
