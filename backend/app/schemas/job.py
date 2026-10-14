"""Pydantic schemas for Job Offers and Recruitment Pipeline."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.inbox import ExtractedJobPayload

JobStatusType = Literal[
    "inbox", "parsing", "failed_parsing", "ready", "applied", "interview", "rejected", "offer"
]
WorkModelType = Literal["remote", "hybrid", "onsite"]
JobPortalType = Literal["justjoin", "pracuj", "nofluffjobs", "linkedin", "generic"]
JobLanguageType = Literal["pl", "en"]


class StructuredJobData(BaseModel):
    """Structured requirements and summary attributes parsed by AI."""

    role_summary: str | None = Field(default=None, description="Concise summary of the role")
    must_have: list[str] = Field(
        default_factory=list, description="Must-have requirements and key skills"
    )
    nice_to_have: list[str] = Field(
        default_factory=list, description="Nice-to-have or optional qualifications"
    )
    tech_stack: list[str] = Field(
        default_factory=list, description="Technologies, frameworks, and tools mentioned"
    )
    benefits: list[str] = Field(
        default_factory=list, description="Key perks, benefits, and employment terms"
    )
    experience_level: str | None = Field(
        default=None, description="Seniority level (e.g. Junior, Mid, Senior, Lead)"
    )

    model_config = ConfigDict(extra="ignore")


class JobOfferBase(BaseModel):
    """Base fields shared across Job Offer operations."""

    source_url: str = Field(..., description="Original URL of the job posting")
    source_portal: JobPortalType = Field(
        default="generic", description="Portal origin of the offer"
    )
    company_name: str | None = Field(default=None, description="Hiring company name")
    role_title: str | None = Field(default=None, description="Position / job title")
    status: JobStatusType = Field(default="inbox", description="Pipeline status")
    error_message: str | None = Field(
        default=None, description="Error message if AI parsing failed"
    )
    language: JobLanguageType = Field(
        default="pl", description="Primary language of the offer: pl or en"
    )
    work_model: WorkModelType | None = Field(
        default=None, description="Work model classification: remote, hybrid, or onsite"
    )
    work_model_details: str | None = Field(
        default=None, description="Detailed terms of remote / hybrid arrangement"
    )
    locations: list[str] = Field(
        default_factory=list, description="List of normalized locations / office cities"
    )
    location_raw: str | None = Field(
        default=None, description="Raw location string from the source posting"
    )
    application_deadline: date | None = Field(
        default=None, description="Application submission deadline date"
    )
    salary_min: int | None = Field(
        default=None, description="Minimum compensation in specified currency"
    )
    salary_max: int | None = Field(
        default=None, description="Maximum compensation in specified currency"
    )
    salary_currency: str | None = Field(
        default="PLN", description="Currency of salary range, defaults to PLN"
    )
    contract_type: str | None = Field(default=None, description="Type of contract: B2B, UoP, etc.")
    notes: str | None = Field(
        default=None, description="Personal candidate notes regarding this offer"
    )


class JobOfferCreate(JobOfferBase):
    """Schema for creating a new Job Offer record."""

    raw_payload: ExtractedJobPayload = Field(
        ..., description="Raw ingestion payload received from extension"
    )
    structured_data: StructuredJobData | None = Field(
        default=None, description="AI-normalized requirements and summary attributes"
    )


class JobOfferUpdate(BaseModel):
    """Schema for updating an existing Job Offer (all fields optional)."""

    source_url: str | None = None
    source_portal: JobPortalType | None = None
    company_name: str | None = None
    role_title: str | None = None
    status: JobStatusType | None = None
    error_message: str | None = None
    language: JobLanguageType | None = None
    work_model: WorkModelType | None = None
    work_model_details: str | None = None
    locations: list[str] | None = None
    location_raw: str | None = None
    application_deadline: date | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    contract_type: str | None = None
    structured_data: StructuredJobData | None = None
    notes: str | None = None


class JobOfferRead(JobOfferBase):
    """Schema for reading a Job Offer from the API."""

    id: UUID = Field(..., description="Unique job offer identifier")
    raw_payload: ExtractedJobPayload = Field(
        ..., description="Raw ingestion payload preserved for audit"
    )
    structured_data: StructuredJobData | None = Field(
        default=None, description="AI-parsed attributes and requirements breakdown"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)
