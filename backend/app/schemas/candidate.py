"""Pydantic schemas for Candidate Knowledge Base and Profile."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CandidateContactInfo(BaseModel):
    """Candidate contact details and external links."""

    email: str | None = Field(default=None, description="Contact email address")
    phone: str | None = Field(default=None, description="Contact telephone number")
    location: str | None = Field(default=None, description="City / Country of residence")
    github: str | None = Field(default=None, description="GitHub profile URL")
    linkedin: str | None = Field(default=None, description="LinkedIn profile URL")
    portfolio: str | None = Field(default=None, description="Personal website or portfolio URL")

    model_config = ConfigDict(extra="ignore")


class SkillCategoryItem(BaseModel):
    """Group of skills under a category."""

    category: str = Field(..., description="Category title (e.g. Languages, Frameworks, Cloud)")
    skills: list[str] = Field(default_factory=list, description="List of specific technologies")

    model_config = ConfigDict(extra="ignore")


class ExperienceItem(BaseModel):
    """Single work experience entry."""

    position: str = Field(..., description="Job role or title")
    company: str = Field(..., description="Employer company name")
    location: str = Field(default="", description="Location or Remote")
    start_date: str = Field(..., description="Flexible start date: YYYY, YYYY-MM, or YYYY-MM-DD")
    end_date: str = Field(
        default="present",
        description="Flexible end date: YYYY, YYYY-MM, YYYY-MM-DD, or 'present'",
    )
    highlights: list[str] = Field(
        default_factory=list, description="Key accomplishments and responsibilities"
    )

    model_config = ConfigDict(extra="ignore")


class ProjectItem(BaseModel):
    """Single project portfolio entry."""

    name: str = Field(..., description="Project name")
    role: str = Field(default="", description="Candidate's role in the project")
    url: str = Field(default="", description="Repository or live demonstration URL")
    start_date: str = Field(default="", description="Flexible start date")
    end_date: str = Field(default="", description="Flexible end date")
    description: str = Field(default="", description="Overview of project purpose and architecture")
    technologies: list[str] = Field(
        default_factory=list, description="Stack of technologies utilized"
    )

    model_config = ConfigDict(extra="ignore")


class EducationItem(BaseModel):
    """Single education entry."""

    institution: str = Field(..., description="University, college, or academy name")
    degree: str = Field(..., description="Degree obtained (e.g. Inżynier, Magister, BSc)")
    field_of_study: str = Field(default="", description="Major or area of specialization")
    start_date: str = Field(default="", description="Start year or date")
    end_date: str = Field(default="", description="Graduation year or date")

    model_config = ConfigDict(extra="ignore")


class CertificateItem(BaseModel):
    """Professional certification entry."""

    name: str = Field(..., description="Certification or course name")
    issuer: str = Field(default="", description="Issuing organization (e.g. AWS, CNCF)")
    issue_date: str = Field(default="", description="Issue date or year")

    model_config = ConfigDict(extra="ignore")


class SummarySectionBlock(BaseModel):
    """Professional summary section."""

    id: str = Field(default="summary", description="Section identifier")
    type: Literal["summary"] = Field(default="summary", description="Section discriminator")
    title: str = Field(default="Podsumowanie zawodowe", description="Header title")
    content: str = Field(default="", description="Tailored text content of summary")

    model_config = ConfigDict(extra="ignore")


class SkillsSectionBlock(BaseModel):
    """Technical skills section."""

    id: str = Field(default="skills", description="Section identifier")
    type: Literal["skills"] = Field(default="skills", description="Section discriminator")
    title: str = Field(default="Umiejętności techniczne", description="Header title")
    items: list[SkillCategoryItem] = Field(
        default_factory=list, description="List of skill categories"
    )

    model_config = ConfigDict(extra="ignore")


class ExperienceSectionBlock(BaseModel):
    """Work experience section."""

    id: str = Field(default="experience", description="Section identifier")
    type: Literal["experience"] = Field(default="experience", description="Section discriminator")
    title: str = Field(default="Doświadczenie zawodowe", description="Header title")
    items: list[ExperienceItem] = Field(
        default_factory=list, description="Chronological work positions"
    )

    model_config = ConfigDict(extra="ignore")


class ProjectsSectionBlock(BaseModel):
    """Featured projects section."""

    id: str = Field(default="projects", description="Section identifier")
    type: Literal["projects"] = Field(default="projects", description="Section discriminator")
    title: str = Field(default="Projekty", description="Header title")
    items: list[ProjectItem] = Field(default_factory=list, description="Portfolio project items")

    model_config = ConfigDict(extra="ignore")


class EducationSectionBlock(BaseModel):
    """Formal education section."""

    id: str = Field(default="education", description="Section identifier")
    type: Literal["education"] = Field(default="education", description="Section discriminator")
    title: str = Field(default="Edukacja", description="Header title")
    items: list[EducationItem] = Field(default_factory=list, description="Education records")

    model_config = ConfigDict(extra="ignore")


class CertificatesSectionBlock(BaseModel):
    """Professional certificates section."""

    id: str = Field(default="certificates", description="Section identifier")
    type: Literal["certificates"] = Field(
        default="certificates", description="Section discriminator"
    )
    title: str = Field(default="Certyfikaty", description="Header title")
    items: list[CertificateItem] = Field(
        default_factory=list, description="Certificates and credentials"
    )

    model_config = ConfigDict(extra="ignore")


class ClauseSectionBlock(BaseModel):
    """GDPR / RODO legal compliance clause section."""

    id: str = Field(default="clause", description="Section identifier")
    type: Literal["clause"] = Field(default="clause", description="Section discriminator")
    title: str = Field(default="Klauzula RODO", description="Header title")
    content: str = Field(default="", description="Legal processing consent text")

    model_config = ConfigDict(extra="ignore")


class CustomSectionBlock(BaseModel):
    """Custom or generic section block."""

    id: str = Field(..., description="Unique section identifier")
    type: str = Field(default="custom", description="Custom section type identifier")
    title: str = Field(default="", description="Section header title")
    content: str | None = Field(default=None, description="Optional narrative text")
    items: list[str] = Field(default_factory=list, description="Optional bullet items")

    model_config = ConfigDict(extra="ignore")


CandidateSectionBlock = (
    SummarySectionBlock
    | SkillsSectionBlock
    | ExperienceSectionBlock
    | ProjectsSectionBlock
    | EducationSectionBlock
    | CertificatesSectionBlock
    | ClauseSectionBlock
    | CustomSectionBlock
)


class CandidateProfileBase(BaseModel):
    """Base schema for candidate profile."""

    full_name: str = Field(..., description="Candidate full name")
    contact_info: CandidateContactInfo = Field(
        default_factory=CandidateContactInfo,
        description="Contact details and professional links",
    )
    sections: list[CandidateSectionBlock] = Field(
        default_factory=list,
        description=(
            "Polymorphic list of knowledge base blocks (experience, projects, education, certs)"
        ),
    )
    default_sections: list[str] = Field(
        default_factory=lambda: ["summary", "skills", "experience", "projects", "education"],
        description="List of section IDs pre-selected by default in CV generation dialog",
    )


class CandidateProfileCreate(CandidateProfileBase):
    """Schema for initializing candidate profile."""

    pass


class CandidateProfileUpdate(BaseModel):
    """Schema for updating candidate profile knowledge base."""

    full_name: str | None = None
    contact_info: CandidateContactInfo | None = None
    sections: list[CandidateSectionBlock] | None = None
    default_sections: list[str] | None = None


class CandidateProfileRead(CandidateProfileBase):
    """Schema for reading candidate profile."""

    id: UUID = Field(..., description="Profile identifier")
    updated_at: datetime = Field(..., description="Timestamp of last knowledge base edit")

    model_config = ConfigDict(from_attributes=True)
