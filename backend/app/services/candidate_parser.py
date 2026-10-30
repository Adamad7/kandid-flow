"""Candidate Knowledge Base parser and default seeder service."""

import asyncio
import copy
import logging
import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.candidate import CandidateProfile
from app.schemas.candidate import (
    AchievementItem,
    AchievementsSectionBlock,
    CandidateAIFillRequest,
    CandidateContactInfo,
    CertificateItem,
    CertificatesSectionBlock,
    ClauseSectionBlock,
    EducationItem,
    EducationSectionBlock,
    ExperienceItem,
    ExperienceSectionBlock,
    InterestsSectionBlock,
    LanguageItem,
    LanguagesSectionBlock,
    ProjectItem,
    ProjectsSectionBlock,
    SkillCategoryItem,
    SkillsSectionBlock,
    SummarySectionBlock,
    TrainingItem,
    TrainingsSectionBlock,
)
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)

DEFAULT_CANDIDATE_DATA: dict[str, Any] = {
    "full_name": "Jan Kowalski",
    "contact_info": {
        "email": "jan.kowalski@example.com",
        "phone": "+48 500 123 456",
        "location": "Warszawa, Polska",
        "github": "github.com/jankowalski",
        "linkedin": "linkedin.com/in/jankowalski",
        "portfolio": "https://jankowalski.dev",
    },
    "default_sections": [
        "summary",
        "skills",
        "experience",
        "projects",
        "education",
        "certificates",
        "languages",
        "trainings",
        "achievements",
        "interests",
        "clause",
    ],
    "sections": [
        {
            "id": "summary",
            "type": "summary",
            "title": "O mnie",
            "content": (
                "Junior DevOps / Platform Engineer z praktycznym doświadczeniem "
                "w automatyzacji CI/CD, konteneryzacji Docker oraz orkiestracji "
                "Kubernetes. Pasjonat kultury GitOps oraz infrastruktury jako kodu (IaC)."
            ),
        },
        {
            "id": "skills",
            "type": "skills",
            "title": "Umiejętności",
            "items": [
                {
                    "category": "Platform & Cloud",
                    "skills": [
                        "Docker",
                        "Kubernetes",
                        "Helm",
                        "Terraform",
                        "AWS",
                        "Linux",
                    ],
                },
                {
                    "category": "CI/CD & Monitoring",
                    "skills": ["GitHub Actions", "GitLab CI", "Prometheus", "Grafana"],
                },
                {
                    "category": "Programowanie & Narzędzia",
                    "skills": ["Python", "FastAPI", "Bash", "PostgreSQL", "Git"],
                },
            ],
        },
        {
            "id": "experience",
            "type": "experience",
            "title": "Doświadczenie zawodowe",
            "items": [
                {
                    "position": "Junior Cloud & DevOps Specialist",
                    "company": "CloudScale Solutions Sp. z o.o.",
                    "location": "Warszawa / Hybrydowo",
                    "start_date": "2023-04",
                    "end_date": "present",
                    "highlights": [
                        "Wdrażanie i utrzymanie manifestów K8s w środowiskach dev/prod.",
                        "Budowanie pipeline'ów CI/CD w GitHub Actions (skrócenie o 45%).",
                        "Automatyzacja provisioningu w AWS przy użyciu Terraform.",
                    ],
                },
                {
                    "position": "Praktykant DevOps",
                    "company": "InnoTech Labs",
                    "location": "Warszawa",
                    "start_date": "2022-07",
                    "end_date": "2022-10",
                    "highlights": [
                        "Konteneryzacja aplikacji z użyciem wieloetapowych Dockerfile.",
                        "Konfiguracja metryk i dashboardów w Prometheus oraz Grafana.",
                    ],
                },
            ],
        },
        {
            "id": "projects",
            "type": "projects",
            "title": "Projekty",
            "items": [
                {
                    "name": "KandidFlow",
                    "role": "Współtwórca & Inżynier Platformy",
                    "url": "github.com/Adamad7/kandid-flow",
                    "start_date": "2024",
                    "end_date": "present",
                    "description": (
                        "Samodzielna platforma do automatyzacji rekrutacji IT "
                        "oparta na FastAPI, Typst i React."
                    ),
                    "technologies": [
                        "Python",
                        "FastAPI",
                        "Typst",
                        "Docker",
                        "PostgreSQL",
                        "React",
                    ],
                },
                {
                    "name": "GitOps Home Lab",
                    "role": "Twórca",
                    "url": "github.com/jankowalski/homelab-gitops",
                    "start_date": "2023",
                    "end_date": "2024",
                    "description": ("Klaster K3s zarządzany w podejściu GitOps z ArgoCD i Helm."),
                    "technologies": ["Kubernetes", "ArgoCD", "K3s", "Helm", "Linux"],
                },
            ],
        },
        {
            "id": "education",
            "type": "education",
            "title": "Edukacja",
            "items": [
                {
                    "institution": "Politechnika Warszawska",
                    "degree": "Inżynier Informatyki",
                    "field_of_study": "Systemy Teleinformatyczne i Sieci",
                    "start_date": "2020-10",
                    "end_date": "2024-02",
                }
            ],
        },
        {
            "id": "certificates",
            "type": "certificates",
            "title": "Certyfikaty",
            "items": [
                {
                    "name": "CKA: Certified Kubernetes Administrator",
                    "issuer": "The Linux Foundation / CNCF",
                    "issue_date": "2024-05",
                },
                {
                    "name": "AWS Certified Cloud Practitioner",
                    "issuer": "Amazon Web Services",
                    "issue_date": "2023-11",
                },
            ],
        },
        {
            "id": "languages",
            "type": "languages",
            "title": "Znajomość języków",
            "items": [
                {"name": "Polski", "level": "Ojczysty (Native)"},
                {"name": "Angielski", "level": "C1"},
                {"name": "Niemiecki", "level": "B2"},
            ],
        },
        {
            "id": "trainings",
            "type": "trainings",
            "title": "Szkolenia",
            "items": [
                {
                    "name": "Zaawansowane wzorce Kubernetes i Service Mesh (Istio)",
                    "organizer": "Cloud Academy",
                    "date": "2024",
                    "description": (
                        "Zaawansowana orkiestracja mikroserwisów, routing ruchu i observability."
                    ),
                },
                {
                    "name": "Production-grade CI/CD z GitHub Actions",
                    "organizer": "DevOps School",
                    "date": "2023",
                    "description": (
                        "Bezpieczeństwo pipeline'ów, self-hosted runnery i automatyzacja wydań."
                    ),
                },
            ],
        },
        {
            "id": "achievements",
            "type": "achievements",
            "title": "Osiągnięcia",
            "items": [
                {
                    "title": "Zwycięzca Hackathonu CloudTech 2023",
                    "issuer": "TechFest Polska",
                    "date": "2023",
                    "description": (
                        "Zaprojektowanie i wdrożenie automatycznego systemu autotuningu klastra "
                        "K8s w 24 godziny."
                    ),
                },
            ],
        },
        {
            "id": "interests",
            "type": "interests",
            "title": "Zainteresowania",
            "items": [
                "Automatyka domowa (Home Assistant)",
                "Open Source",
                "Kolarstwo gravelowe",
            ],
            "content": (
                "Pasjonat kolarstwa długodystansowego oraz projektowania inteligentnego domu "
                "z użyciem otwartego oprogramowania."
            ),
        },
        {
            "id": "clause",
            "type": "clause",
            "title": "Klauzula RODO",
            "content": (
                "Wyrażam zgodę na przetwarzanie moich danych osobowych "
                "dla potrzeb niezbędnych do realizacji procesu rekrutacji zgodnie "
                "z RODO."
            ),
        },
    ],
}

CANDIDATE_PARSER_SYSTEM_PROMPT = """You are an expert HR data parsing assistant.
Analyze candidate text (resume, CV, notes, LinkedIn export, bio, or narrative
descriptions in Polish or English) and extract structured candidate information into valid JSON.

The JSON MUST adhere to this exact structure:
{
  "full_name": "Full Name or null",
  "contact_info": {
    "email": "email or null",
    "phone": "telephone or null",
    "location": "city/country or null",
    "github": "github url or handle or null",
    "linkedin": "linkedin url or handle or null",
    "portfolio": "portfolio or personal website url or null"
  },
  "sections": [
    {
      "id": "summary",
      "type": "summary",
      "title": "O mnie",
      "content": "Professional summary or bio narrative"
    },
    {
      "id": "skills",
      "type": "skills",
      "title": "Umiejętności",
      "items": [
        {
          "category": "Category name (e.g. Platform & Cloud, Programowanie, Bazy danych)",
          "skills": ["Skill 1", "Skill 2"]
        }
      ]
    },
    {
      "id": "experience",
      "type": "experience",
      "title": "Doświadczenie zawodowe",
      "items": [
        {
          "position": "Job role / title",
          "company": "Employer name",
          "location": "City or Remote",
          "start_date": "YYYY or YYYY-MM",
          "end_date": "YYYY, YYYY-MM, or 'present'",
          "highlights": ["Key achievement or responsibility"]
        }
      ]
    },
    {
      "id": "projects",
      "type": "projects",
      "title": "Projekty",
      "items": [
        {
          "name": "Project name",
          "role": "Role in project",
          "url": "Project URL or GitHub repository",
          "start_date": "YYYY or empty",
          "end_date": "YYYY or present or empty",
          "description": "Short description of project",
          "technologies": ["Tech 1", "Tech 2"]
        }
      ]
    },
    {
      "id": "education",
      "type": "education",
      "title": "Edukacja",
      "items": [
        {
          "institution": "University / school name",
          "degree": "Degree (e.g. Inżynier, Magister, BSc)",
          "field_of_study": "Major / Field of study",
          "start_date": "YYYY or empty",
          "end_date": "YYYY or empty"
        }
      ]
    },
    {
      "id": "certificates",
      "type": "certificates",
      "title": "Certyfikaty",
      "items": [
        {
          "name": "Certificate or course title",
          "issuer": "Issuing organization",
          "issue_date": "YYYY or YYYY-MM"
        }
      ]
    },
    {
      "id": "languages",
      "type": "languages",
      "title": "Znajomość języków",
      "items": [
        {
          "name": "Language name (e.g. Angielski, Niemiecki)",
          "level": "Proficiency level (e.g. C1, B2, Średniozaawansowany, Biegły, Ojczysty (Native))"
        }
      ]
    },
    {
      "id": "trainings",
      "type": "trainings",
      "title": "Szkolenia",
      "items": [
        {
          "name": "Training or course name",
          "organizer": "Organizer or platform",
          "date": "YYYY or YYYY-MM",
          "description": "Optional short summary"
        }
      ]
    },
    {
      "id": "achievements",
      "type": "achievements",
      "title": "Osiągnięcia",
      "items": [
        {
          "title": "Achievement or award title",
          "issuer": "Awarding body or organizer",
          "date": "YYYY",
          "description": "Details of the achievement"
        }
      ]
    },
    {
      "id": "interests",
      "type": "interests",
      "title": "Zainteresowania",
      "items": ["Interest 1", "Interest 2"],
      "content": "Optional narrative description"
    },
    {
      "id": "clause",
      "type": "clause",
      "title": "Klauzula RODO",
      "content": "RODO / GDPR consent clause text"
    }
  ]
}

STRICT SECTION MANDATE:
- The JSON response MUST ALWAYS contain ALL 11 standard sections in the "sections" array:
  "summary", "skills", "experience", "projects", "education", "certificates",
  "languages", "trainings", "achievements", "interests", "clause".
- Even if data for a section is missing from the input, you MUST STILL return that section
  with an empty array `items: []` or empty string `content: ""`. NEVER omit any of the 11 sections.

STRICT SECTION EXCLUSION & NEGATIVE CONSTRAINTS:
- CRITICAL: Universities, schools, colleges, degrees, and academic studies
  MUST NEVER be placed into "projects". They belong EXCLUSIVELY to "education".
- CRITICAL: Professional certifications, diplomas, credentials, and state qualifications
  (e.g. CCNA, AWS, Cisco, OKE Kraków, GCP) MUST NEVER be placed into "projects".
  They belong EXCLUSIVELY to "certificates".
- CRITICAL: Internships, apprenticeships, and jobs (e.g. Praktykant, Stażysta, employment)
  MUST NEVER be placed into "projects". They belong EXCLUSIVELY to "experience".
- "projects" MUST ONLY contain technical projects, software repositories, applications,
  homelab environments, open-source libraries, infrastructure, and engineering projects.

NARRATIVE & FREE-FORM EXTRACTION INSTRUCTIONS:
- Extract all professional background faithfully, even when written as informal narrative or notes:
  - Studies, universities, and academic degrees (e.g. "Student studiów magisterskich
    na Politechnice Lubelskiej"): MUST be extracted into the "education" section
    (institution: "Politechnika Lubelska", degree: "Studia magisterskie / Magister",
    start_date: "present" or approximate year).
  - Software deployments, published apps, personal or commercial projects (e.g. "wdrożenie
    działającej aplikacji do Google Play oraz jej utrzymywanie"): MUST be extracted into the
    "projects" section or "experience" section (name/position: "Twórca aplikacji mobilnej",
    description/highlights: "Wdrożenie działającej aplikacji do Google Play oraz jej utrzymywanie",
    technologies: ["Aplikacje mobilne", "Google Play", "AI"]).
  - Skills, programming languages, libraries, tools, and methodologies: MUST be extracted and
    grouped logically by category in the "skills" section.
  - Foreign and native languages (e.g. "Angielski C1", "Polski ojczysty"): MUST be extracted
    into the "languages" section with name and level.
  - Completed trainings, workshops, bootcamps, and specialized courses: MUST be extracted into the
    "trainings" section.
  - Awards, competitions, hackathons, open-source milestones, or honors: MUST be extracted into the
    "achievements" section.
  - Hobbies, personal interests, sports, and passions: MUST be extracted into the "interests"
    section (as tags in items and/or narrative in content).
  - Professional bio, career goals, and narrative summaries: MUST be extracted into the
    "summary" section ("O mnie").
- Preserve technical keywords, library names, frameworks, and tools faithfully.
- Return ONLY valid JSON, with NO surrounding explanations, conversational text,
  or markdown code fences.
"""

STANDARD_SECTION_ORDER: list[str] = [
    "summary",
    "skills",
    "experience",
    "projects",
    "education",
    "certificates",
    "languages",
    "trainings",
    "achievements",
    "interests",
    "clause",
]

DEFAULT_SECTION_SKELETONS: dict[str, dict[str, Any]] = {
    "summary": {
        "id": "summary",
        "type": "summary",
        "title": "O mnie",
        "content": "",
    },
    "skills": {
        "id": "skills",
        "type": "skills",
        "title": "Umiejętności",
        "items": [],
    },
    "experience": {
        "id": "experience",
        "type": "experience",
        "title": "Doświadczenie zawodowe",
        "items": [],
    },
    "projects": {
        "id": "projects",
        "type": "projects",
        "title": "Projekty",
        "items": [],
    },
    "education": {
        "id": "education",
        "type": "education",
        "title": "Edukacja",
        "items": [],
    },
    "certificates": {
        "id": "certificates",
        "type": "certificates",
        "title": "Certyfikaty",
        "items": [],
    },
    "languages": {
        "id": "languages",
        "type": "languages",
        "title": "Znajomość języków",
        "items": [],
    },
    "trainings": {
        "id": "trainings",
        "type": "trainings",
        "title": "Szkolenia",
        "items": [],
    },
    "achievements": {
        "id": "achievements",
        "type": "achievements",
        "title": "Osiągnięcia",
        "items": [],
    },
    "interests": {
        "id": "interests",
        "type": "interests",
        "title": "Zainteresowania",
        "items": [],
        "content": "",
    },
    "clause": {
        "id": "clause",
        "type": "clause",
        "title": "Klauzula RODO",
        "content": "",
    },
}


def _extract_raw_sections(parsed_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract raw section list from LLM output, handling varied response structures."""
    if not isinstance(parsed_data, dict):
        return []

    sections = parsed_data.get("sections")

    # Case 1: "sections" is a list
    if isinstance(sections, list):
        return [s for s in sections if isinstance(s, dict)]

    # Case 2: "sections" is a dictionary (keyed by section id or index)
    if isinstance(sections, dict):
        result: list[dict[str, Any]] = []
        for key, val in sections.items():
            if isinstance(val, dict):
                sec = dict(val)
                sec.setdefault("id", key)
                sec.setdefault("type", key)
                result.append(sec)
            elif isinstance(val, list):
                result.append({"id": key, "type": key, "items": val})
            elif isinstance(val, str):
                result.append({"id": key, "type": key, "content": val})
        if result:
            return result

    # Case 3: Sections are placed as top-level keys in parsed_data
    top_level_sections: list[dict[str, Any]] = []
    for key in STANDARD_SECTION_ORDER:
        if key in parsed_data:
            val = parsed_data[key]
            if isinstance(val, dict):
                sec = dict(val)
                sec.setdefault("id", key)
                sec.setdefault("type", key)
                top_level_sections.append(sec)
            elif isinstance(val, list):
                top_level_sections.append({"id": key, "type": key, "items": val})
            elif isinstance(val, str):
                top_level_sections.append({"id": key, "type": key, "content": val})

    if top_level_sections:
        return top_level_sections

    return []


def _sanitize_parsed_sections(raw_sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sanitize and validate raw sections from LLM output into compliant schema dicts.

    Guarantees all 7 standard sections are present in the returned list.
    """
    sanitized: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for sec in raw_sections:
        if not isinstance(sec, dict):
            continue
        sec_type = str(sec.get("type") or sec.get("id") or "").strip().lower()

        if sec_type in seen_ids:
            continue

        if sec_type == "summary":
            content_val = sec.get("content") or sec.get("description") or sec.get("text") or ""
            block = SummarySectionBlock(
                id="summary",
                type="summary",
                title=sec.get("title") or "O mnie",
                content=str(content_val),
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("summary")

        elif sec_type == "skills":
            raw_items = sec.get("items") or sec.get("skills") or []
            items: list[SkillCategoryItem] = []
            if isinstance(raw_items, list):
                for it in raw_items:
                    if isinstance(it, dict):
                        cat_name = str(
                            it.get("category") or it.get("name") or "Umiejętności"
                        ).strip()
                        raw_skills = it.get("skills") or it.get("items") or []
                        if isinstance(raw_skills, str):
                            skills_list = [s.strip() for s in raw_skills.split(",") if s.strip()]
                        elif isinstance(raw_skills, list):
                            skills_list = [str(s).strip() for s in raw_skills if str(s).strip()]
                        else:
                            skills_list = []
                        if skills_list:
                            items.append(SkillCategoryItem(category=cat_name, skills=skills_list))
                    elif isinstance(it, str) and it.strip():
                        items.append(
                            SkillCategoryItem(category="Umiejętności", skills=[it.strip()])
                        )
            block = SkillsSectionBlock(
                id="skills",
                type="skills",
                title=sec.get("title") or "Umiejętności",
                items=items,
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("skills")

        elif sec_type == "experience":
            raw_items = sec.get("items") or []
            exp_items: list[ExperienceItem] = []
            if isinstance(raw_items, list):
                for it in raw_items:
                    if isinstance(it, dict):
                        pos = str(
                            it.get("position") or it.get("role") or it.get("title") or "Specjalista"
                        ).strip()
                        comp = str(
                            it.get("company")
                            or it.get("employer")
                            or it.get("organization")
                            or "Firma"
                        ).strip()
                        s_date = str(
                            it.get("start_date") or it.get("startDate") or it.get("from") or "2020"
                        ).strip()
                        e_date = str(
                            it.get("end_date") or it.get("endDate") or it.get("to") or "present"
                        ).strip()
                        loc = str(it.get("location") or "").strip()
                        raw_hl = (
                            it.get("highlights")
                            or it.get("responsibilities")
                            or it.get("description")
                            or []
                        )
                        if isinstance(raw_hl, str):
                            highlights = [raw_hl.strip()] if raw_hl.strip() else []
                        elif isinstance(raw_hl, list):
                            highlights = [str(h).strip() for h in raw_hl if str(h).strip()]
                        else:
                            highlights = []
                        exp_items.append(
                            ExperienceItem(
                                position=pos,
                                company=comp,
                                location=loc,
                                start_date=s_date,
                                end_date=e_date,
                                highlights=highlights,
                            )
                        )
            block = ExperienceSectionBlock(
                id="experience",
                type="experience",
                title=sec.get("title") or "Doświadczenie zawodowe",
                items=exp_items,
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("experience")

        elif sec_type == "projects":
            raw_items = sec.get("items") or []
            proj_items: list[ProjectItem] = []
            if isinstance(raw_items, list):
                for it in raw_items:
                    if isinstance(it, dict):
                        name = str(it.get("name") or it.get("title") or "Projekt").strip()
                        role = str(it.get("role") or "").strip()
                        url = str(it.get("url") or it.get("link") or "").strip()
                        s_date = str(
                            it.get("start_date") or it.get("startDate") or it.get("from") or ""
                        ).strip()
                        e_date = str(
                            it.get("end_date") or it.get("endDate") or it.get("to") or ""
                        ).strip()
                        desc = str(it.get("description") or "").strip()
                        raw_tech = it.get("technologies") or it.get("tech") or it.get("stack") or []
                        if isinstance(raw_tech, str):
                            techs = [t.strip() for t in raw_tech.split(",") if t.strip()]
                        elif isinstance(raw_tech, list):
                            techs = [str(t).strip() for t in raw_tech if str(t).strip()]
                        else:
                            techs = []
                        proj_items.append(
                            ProjectItem(
                                name=name,
                                role=role,
                                url=url,
                                start_date=s_date,
                                end_date=e_date,
                                description=desc,
                                technologies=techs,
                            )
                        )
            block = ProjectsSectionBlock(
                id="projects",
                type="projects",
                title=sec.get("title") or "Projekty",
                items=proj_items,
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("projects")

        elif sec_type == "education":
            raw_items = sec.get("items") or []
            edu_items: list[EducationItem] = []
            if isinstance(raw_items, list):
                for it in raw_items:
                    if isinstance(it, dict):
                        inst = str(
                            it.get("institution")
                            or it.get("school")
                            or it.get("university")
                            or "Uczelnia"
                        ).strip()
                        deg = str(
                            it.get("degree") or it.get("title") or "Wykształcenie wyższe"
                        ).strip()
                        fos = str(
                            it.get("field_of_study") or it.get("major") or it.get("field") or ""
                        ).strip()
                        s_date = str(
                            it.get("start_date") or it.get("startDate") or it.get("from") or ""
                        ).strip()
                        e_date = str(
                            it.get("end_date") or it.get("endDate") or it.get("to") or ""
                        ).strip()
                        edu_items.append(
                            EducationItem(
                                institution=inst,
                                degree=deg,
                                field_of_study=fos,
                                start_date=s_date,
                                end_date=e_date,
                            )
                        )
            block = EducationSectionBlock(
                id="education",
                type="education",
                title=sec.get("title") or "Edukacja",
                items=edu_items,
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("education")

        elif sec_type == "certificates":
            raw_items = sec.get("items") or []
            cert_items: list[CertificateItem] = []
            if isinstance(raw_items, list):
                for it in raw_items:
                    if isinstance(it, dict):
                        name = str(it.get("name") or it.get("title") or "Certyfikat").strip()
                        issuer = str(it.get("issuer") or it.get("organization") or "").strip()
                        issue_date = str(it.get("issue_date") or it.get("date") or "").strip()
                        cert_items.append(
                            CertificateItem(
                                name=name,
                                issuer=issuer,
                                issue_date=issue_date,
                            )
                        )
            block = CertificatesSectionBlock(
                id="certificates",
                type="certificates",
                title=sec.get("title") or "Certyfikaty",
                items=cert_items,
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("certificates")

        elif sec_type == "languages":
            raw_items = sec.get("items") or sec.get("languages") or []
            lang_items: list[LanguageItem] = []
            if isinstance(raw_items, list):
                for it in raw_items:
                    if isinstance(it, dict):
                        lname = str(it.get("name") or it.get("language") or "").strip()
                        llevel = str(it.get("level") or it.get("proficiency") or "").strip()
                        if lname:
                            lang_items.append(
                                LanguageItem(name=lname, level=llevel or "Podstawowy")
                            )
                    elif isinstance(it, str) and it.strip():
                        lang_items.append(LanguageItem(name=it.strip(), level="Znajomość"))
            block = LanguagesSectionBlock(
                id="languages",
                type="languages",
                title=sec.get("title") or "Znajomość języków",
                items=lang_items,
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("languages")

        elif sec_type in ("trainings", "courses"):
            raw_items = sec.get("items") or sec.get("trainings") or sec.get("courses") or []
            train_items: list[TrainingItem] = []
            if isinstance(raw_items, list):
                for it in raw_items:
                    if isinstance(it, dict):
                        tname = str(it.get("name") or it.get("title") or "").strip()
                        torg = str(
                            it.get("organizer") or it.get("provider") or it.get("issuer") or ""
                        ).strip()
                        tdate = str(it.get("date") or it.get("completion_date") or "").strip()
                        tdesc = str(it.get("description") or "").strip()
                        if tname:
                            train_items.append(
                                TrainingItem(
                                    name=tname,
                                    organizer=torg,
                                    date=tdate,
                                    description=tdesc,
                                )
                            )
                    elif isinstance(it, str) and it.strip():
                        train_items.append(TrainingItem(name=it.strip()))
            block = TrainingsSectionBlock(
                id="trainings",
                type="trainings",
                title=sec.get("title") or "Szkolenia",
                items=train_items,
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("trainings")

        elif sec_type == "achievements":
            raw_items = sec.get("items") or sec.get("achievements") or []
            ach_items: list[AchievementItem] = []
            if isinstance(raw_items, list):
                for it in raw_items:
                    if isinstance(it, dict):
                        atitle = str(it.get("title") or it.get("name") or "").strip()
                        aissuer = str(it.get("issuer") or it.get("organization") or "").strip()
                        adate = str(it.get("date") or "").strip()
                        adesc = str(it.get("description") or "").strip()
                        if atitle:
                            ach_items.append(
                                AchievementItem(
                                    title=atitle,
                                    issuer=aissuer,
                                    date=adate,
                                    description=adesc,
                                )
                            )
                    elif isinstance(it, str) and it.strip():
                        ach_items.append(AchievementItem(title=it.strip()))
            block = AchievementsSectionBlock(
                id="achievements",
                type="achievements",
                title=sec.get("title") or "Osiągnięcia",
                items=ach_items,
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("achievements")

        elif sec_type in ("interests", "hobbies"):
            raw_items = sec.get("items") or sec.get("interests") or sec.get("hobbies") or []
            items_list: list[str] = []
            if isinstance(raw_items, str):
                items_list = [i.strip() for i in raw_items.split(",") if i.strip()]
            elif isinstance(raw_items, list):
                for it in raw_items:
                    if isinstance(it, str) and it.strip():
                        items_list.append(it.strip())
                    elif isinstance(it, dict):
                        val = str(it.get("name") or it.get("title") or "").strip()
                        if val:
                            items_list.append(val)
            content_val = sec.get("content") or sec.get("description") or sec.get("text") or ""
            block = InterestsSectionBlock(
                id="interests",
                type="interests",
                title=sec.get("title") or "Zainteresowania",
                items=items_list,
                content=str(content_val).strip(),
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("interests")

        elif sec_type == "clause":
            content_val = sec.get("content") or sec.get("text") or ""
            block = ClauseSectionBlock(
                id="clause",
                type="clause",
                title=sec.get("title") or "Klauzula RODO",
                content=str(content_val),
            )
            sanitized.append(block.model_dump(mode="json"))
            seen_ids.add("clause")

    # Guarantee all 7 standard sections are present
    for sec_id in STANDARD_SECTION_ORDER:
        if sec_id not in seen_ids:
            sanitized.append(copy.deepcopy(DEFAULT_SECTION_SKELETONS[sec_id]))
            seen_ids.add(sec_id)

    order_index = {sec_id: idx for idx, sec_id in enumerate(STANDARD_SECTION_ORDER)}
    sanitized.sort(key=lambda s: order_index.get(s.get("id", ""), 999))
    return sanitized


def _extract_contact_info_regex(text: str) -> dict[str, str | None]:
    """Extract contact information and full name deterministically using regex.

    Guarantees reliable extraction of email, phone, GitHub, LinkedIn, portfolio,
    location, and name without LLM token cost or hallucination.
    """
    result: dict[str, str | None] = {
        "full_name": None,
        "email": None,
        "phone": None,
        "location": None,
        "github": None,
        "linkedin": None,
        "portfolio": None,
    }

    if not text or not isinstance(text, str):
        return result

    # 1. Full name extraction
    name_pattern = (
        r"(?:imię\s+i\s+nazwisko|imie\s+i\s+nazwisko|full\s+name|name):\s*"
        r"([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:[ \t]+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)+)"
    )
    m_name_label = re.search(name_pattern, text, re.IGNORECASE)
    if m_name_label:
        result["full_name"] = m_name_label.group(1).strip()
    else:
        m_h1 = re.search(
            r"^#\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:[ \t]+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)+)",
            text,
            re.MULTILINE,
        )
        if m_h1:
            candidate_h1 = m_h1.group(1).strip()
            lower_h1 = candidate_h1.lower()
            if not any(
                term in lower_h1
                for term in [
                    "baza wiedzy",
                    "curriculum",
                    "doświadczenie",
                    "wykształcenie",
                    "edukacja",
                    "projekty",
                    "umiejętności",
                    "certyfikaty",
                    "kontakt",
                ]
            ):
                result["full_name"] = candidate_h1

    # 1b. Fallback to LinkedIn or Email name extraction if full_name is still None
    if not result["full_name"]:
        m_li = re.search(
            r"linkedin\.com/in/([a-zA-ZĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)-([a-zA-ZĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)(?:-[a-zA-Z0-9]+)?",
            text,
            re.IGNORECASE,
        )
        if m_li:
            fn = m_li.group(1).capitalize()
            ln = m_li.group(2).capitalize()
            result["full_name"] = f"{fn} {ln}"
        else:
            m_em = re.search(
                r"\b([a-zA-ZĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)\.([a-zA-ZĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)[0-9]*@[a-zA-Z0-9-]+\.",
                text,
            )
            if m_em:
                fn = m_em.group(1).capitalize()
                ln = m_em.group(2).capitalize()
                result["full_name"] = f"{fn} {ln}"

    # 2. Email extraction
    m_email = re.search(r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b", text)
    if m_email:
        result["email"] = m_email.group(0).strip().rstrip(".")

    # 3. Phone extraction
    m_phone_labeled = re.search(
        r"(?:telefon|tel\.?|phone|mobile|kom\.?):\s*([+\d\s().-]{7,25})",
        text,
        re.IGNORECASE,
    )
    if m_phone_labeled:
        raw_phone = m_phone_labeled.group(1).strip()
        cleaned_phone = re.sub(r"[^\d+]", "", raw_phone)
        if len(cleaned_phone) >= 9:
            result["phone"] = raw_phone.strip().rstrip(".,;")
    else:
        m_phone_pl = re.search(
            r"(?<!\w)(?:\+48[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}(?!\d)",
            text,
        )
        if m_phone_pl:
            cand_phone = m_phone_pl.group(0).strip()
            digits_only = re.sub(r"\D", "", cand_phone)
            if len(digits_only) in (9, 11):
                result["phone"] = cand_phone

    # 4. GitHub extraction
    m_github = re.search(
        r"(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_-]+)",
        text,
        re.IGNORECASE,
    )
    if m_github:
        gh_user = m_github.group(1).strip()
        if gh_user.lower() not in ("none", "null", "undefined"):
            result["github"] = f"github.com/{gh_user}"

    # 5. LinkedIn extraction
    m_linkedin = re.search(
        r"(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9_%-]+)",
        text,
        re.IGNORECASE,
    )
    if m_linkedin:
        li_user = m_linkedin.group(1).strip()
        if li_user.lower() not in ("none", "null", "undefined"):
            result["linkedin"] = f"linkedin.com/in/{li_user}"

    # 6. Portfolio / Personal website extraction
    m_port_labeled = re.search(
        r"(?:portfolio|strona\s*www|strona|website|web|www|url):\s*(https?://[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)",
        text,
        re.IGNORECASE,
    )
    if m_port_labeled:
        p_val = m_port_labeled.group(1).strip().rstrip(".,;")
        if "github.com" not in p_val.lower() and "linkedin.com" not in p_val.lower():
            result["portfolio"] = p_val
    else:
        m_port_url = re.search(
            r"https?://(?!github\.com|linkedin\.com|www\.github\.com|www\.linkedin\.com)[a-zA-Z0-9_.-]+\.[a-zA-Z]{2,}(?:/[^\s)]*)?",
            text,
            re.IGNORECASE,
        )
        if m_port_url:
            p_val = m_port_url.group(0).strip().rstrip(".,;)")
            result["portfolio"] = p_val

    # 7. Location extraction
    m_loc = re.search(
        r"(?:lokalizacja|miejsce\s+zamieszkania|miasto|location|city):\s*([^\n,]+(?:,\s*[^\n]+)?)",
        text,
        re.IGNORECASE,
    )
    if m_loc:
        result["location"] = m_loc.group(1).strip().rstrip(".,;")

    return result


SECTION_HEADER_MAP: dict[str, list[str]] = {
    "summary": [
        "podsumowanie zawodowe",
        "podsumowanie",
        "o mnie",
        "profil zawodowy",
        "profil",
        "bio",
        "o sobie",
        "summary",
        "professional summary",
        "about me",
        "about",
    ],
    "skills": [
        "umiejętności techniczne",
        "umiejętności",
        "kompetencje",
        "technologie",
        "narzędzia",
        "stack technologiczny",
        "stack",
        "skills",
        "technical skills",
        "competencies",
        "technologies",
        "tools",
    ],
    "experience": [
        "doświadczenie zawodowe",
        "doświadczenie",
        "historia zatrudnienia",
        "przebieg kariery",
        "praca",
        "zatrudnienie",
        "work experience",
        "professional experience",
        "experience",
        "employment history",
        "employment",
    ],
    "projects": [
        "wybrane projekty",
        "projekty",
        "portfolio",
        "realizacje",
        "twórczość",
        "selected projects",
        "projects",
        "personal projects",
    ],
    "education": [
        "historia edukacji",
        "wykształcenie",
        "edukacja",
        "studia",
        "szkoły",
        "education",
        "academic background",
        "studies",
    ],
    "certificates": [
        "uzyskane certyfikaty",
        "certyfikaty",
        "certyfikacje",
        "uprawnienia",
        "certificates",
        "certifications",
        "credentials",
    ],
    "languages": [
        "znajomość języków",
        "języki obce",
        "języki",
        "languages",
        "language skills",
        "foreign languages",
    ],
    "trainings": [
        "kursy i szkolenia",
        "szkolenia",
        "kursy",
        "warsztaty",
        "trainings",
        "courses",
        "workshops",
    ],
    "achievements": [
        "osiągnięcia",
        "sukcesy",
        "nagrody",
        "wyróżnienia",
        "achievements",
        "awards",
        "honors",
    ],
    "interests": [
        "zainteresowania",
        "hobby",
        "pasje",
        "interests",
        "hobbies",
    ],
    "clause": [
        "zgoda na przetwarzanie danych",
        "klauzula rodo",
        "klauzula",
        "rodo",
        "zgoda",
        "clause",
        "gdpr clause",
        "data protection clause",
    ],
    "contact": [
        "dane kontaktowe",
        "kontakt",
        "dane osobowe",
        "contact info",
        "contact details",
        "contact",
    ],
}


def _detect_dominant_heading_level(text: str) -> int:
    """Detect dominant markdown heading level (# or ##) for resume sections."""
    level_counts = {1: 0, 2: 0, 3: 0}
    for line in text.splitlines():
        m = re.match(r"^(#{1,3})\s+(.+)$", line.strip())
        if m:
            lvl = len(m.group(1))
            raw_hdr = re.sub(r"[:*#]+$", "", m.group(2)).strip().lower()
            cleaned = re.sub(r"^(?:\d+[\.\)]|[IVXLCDM]+[\.\)])\s*", "", raw_hdr).strip()
            for syns in SECTION_HEADER_MAP.values():
                if any(
                    cleaned == syn
                    or cleaned.startswith(f"{syn}:")
                    or cleaned.startswith(f"{syn} -")
                    for syn in syns
                ):
                    level_counts[lvl] += 1
                    break
    if level_counts[1] >= 2:
        return 1
    if level_counts[2] >= 2:
        return 2
    if level_counts[1] == 1 and level_counts[2] == 0:
        return 1
    if level_counts[2] == 1 and level_counts[1] == 0:
        return 2
    return 0


def _normalize_header(line: str, allowed_level: int = 1) -> str | None:
    """Classify a line as a standard section header if matched against known synonyms."""
    raw = line.strip()
    if not raw:
        return None

    header_text: str | None = None
    m_md = re.match(r"^(#{1,6})\s+(.+)$", raw)
    if m_md:
        if len(m_md.group(1)) != allowed_level:
            return None
        header_text = m_md.group(2).strip()
    else:
        # If document uses markdown headers, only headings at allowed_level can be section
        # boundaries
        if allowed_level in (1, 2):
            return None

        # Fallback for plain text documents without markdown headings
        m_bold = re.match(r"^\*\*(.+?)\*\*:?$", raw)
        if m_bold:
            header_text = m_bold.group(1).strip()
        else:
            m_label = re.match(r"^([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s\d.-]{3,50}):?$", raw)
            if m_label and (raw.isupper() or raw.endswith(":")):
                header_text = m_label.group(1).strip()

    if not header_text:
        return None

    # Strip numbering prefix like "1. ", "1) ", "I. "
    cleaned = re.sub(r"^(?:\d+[\.\)]|[IVXLCDM]+[\.\)])\s*", "", header_text).strip()
    cleaned = re.sub(r"[:*#]+$", "", cleaned).strip().lower()

    for sec_id, synonyms in SECTION_HEADER_MAP.items():
        for syn in synonyms:
            if (
                cleaned == syn
                or cleaned.startswith(f"{syn}:")
                or cleaned.startswith(f"{syn} -")
                or cleaned.startswith(f"{syn} –")
            ):
                return sec_id

    return None


def _segment_raw_text(text: str) -> dict[str, str]:
    """Segment raw Markdown or structured text into isolated section blocks.

    Recognizes standard section headings and isolates their respective text blocks,
    preventing cross-contamination across sections during parsing.
    """
    allowed_level = _detect_dominant_heading_level(text)
    segments: dict[str, list[str]] = {}
    current_section = "header"
    segments[current_section] = []

    lines = text.splitlines()
    for line in lines:
        detected_sec = _normalize_header(line, allowed_level=allowed_level)
        if detected_sec:
            current_section = detected_sec
            if current_section not in segments:
                segments[current_section] = []
        else:
            segments[current_section].append(line)

    result: dict[str, str] = {}
    for sec_id, sec_lines in segments.items():
        joined = "\n".join(sec_lines).strip()
        if joined:
            result[sec_id] = joined

    return result


SECTION_PROMPTS: dict[str, str] = {
    "education": """You are an expert HR data parsing assistant.
Extract ALL educational entries (universities, colleges, technical schools, degrees)
from the text into valid JSON.
There may be multiple schools or degrees - you MUST extract EVERY single one into the 'items' list.
Do NOT stop after just 1 entry.

JSON Structure:
{
  "items": [
    {
      "institution": "University or school name",
      "degree": "Degree or title (e.g. Inżynier, Magister, Licencjat, Technik, BSc, MSc)",
      "field_of_study": "Major or field of study (or empty string)",
      "start_date": "Start year (YYYY) or empty string",
      "end_date": "End year (YYYY), 'present', or empty string"
    }
  ]
}
Return ONLY valid JSON.
""",
    "experience": """You are an expert HR data parsing assistant.
Extract professional work experience, employment history, and internships from the text
into valid JSON.

JSON Structure:
{
  "items": [
    {
      "position": "Job role / title (e.g. Software Engineer, Praktykant, DevOps Specialist)",
      "company": "Company / employer name",
      "location": "City or remote (or empty string)",
      "start_date": "Start date (YYYY or YYYY-MM)",
      "end_date": "End date (YYYY, YYYY-MM, or 'present')",
      "highlights": ["Key responsibility or achievement"]
    }
  ]
}
Return ONLY valid JSON.
""",
    "projects": """You are an expert HR data parsing assistant.
Extract ALL technical projects (applications, open-source repositories, infrastructure,
homelab, websites, systems) from the text into valid JSON.
Each project heading (e.g. '### Project Name') MUST be extracted as an item in the 'items' list.
You MUST extract EVERY SINGLE project found in the text. Do NOT stop after just 1 project.

JSON Structure:
{
  "items": [
    {
      "name": "Project name",
      "role": "Role in project (e.g. Twórca, Współtwórca, Maintainer)",
      "url": "Project or repository URL (or empty string)",
      "start_date": "YYYY or empty string",
      "end_date": "YYYY, 'present', or empty string",
      "description": "Short project summary and purpose",
      "technologies": ["Tech 1", "Tech 2"]
    }
  ]
}

NEGATIVE CONSTRAINTS:
- DO NOT extract schools, academic studies, or degrees as projects. They belong to education.
- DO NOT extract certifications (CCNA, AWS, Cisco, etc.) as projects. They belong to certificates.
- DO NOT extract commercial employment or company internships (e.g. Praktykant) as projects.
  They belong to experience.

Return ONLY valid JSON.
""",
    "skills": """You are an expert HR data parsing assistant.
Extract technical and professional skills grouped by category from the text into valid JSON.

JSON Structure:
{
  "items": [
    {
      "category": "Category name (e.g. Platform & Cloud, Backend, Programowanie, Narzędzia)",
      "skills": ["Skill 1", "Skill 2"]
    }
  ]
}
Return ONLY valid JSON.
""",
    "certificates": """You are an expert HR data parsing assistant.
Extract ALL professional certificates, qualifications, and exams from the text into valid JSON.
Extract EVERY single certificate into the 'items' list. Do NOT stop after the first certificate.

JSON Structure:
{
  "items": [
    {
      "name": "Certificate name",
      "issuer": "Issuing organization or authority",
      "issue_date": "Issue date (YYYY or YYYY-MM) or empty string"
    }
  ]
}
Return ONLY valid JSON.
""",
    "languages": """You are an expert HR data parsing assistant.
Extract spoken/written language proficiencies from the text into valid JSON.

JSON Structure:
{
  "items": [
    {
      "name": "Language name (e.g. Polski, Angielski, Niemiecki)",
      "level": "Proficiency level (e.g. Ojczysty (Native), C1, B2, Średniozaawansowany)"
    }
  ]
}
Return ONLY valid JSON.
""",
    "trainings": """You are an expert HR data parsing assistant.
Extract ALL professional trainings, courses, and workshops from the text into valid JSON.
Extract EVERY single course or training into the 'items' list. Do NOT repeat text or loop.

JSON Structure:
{
  "items": [
    {
      "name": "Training or course name",
      "organizer": "Organizer, institution, or platform",
      "date": "Date (YYYY or YYYY-MM) or empty string",
      "description": "Short description or empty string"
    }
  ]
}
Return ONLY valid JSON.
""",
    "achievements": """You are an expert HR data parsing assistant.
Extract awards, hackathons, competition results, and key honors from the text into valid JSON.

JSON Structure:
{
  "items": [
    {
      "title": "Achievement or award title",
      "issuer": "Awarding body or organizer",
      "date": "Date (YYYY) or empty string",
      "description": "Details of the achievement"
    }
  ]
}
Return ONLY valid JSON.
""",
    "interests": """You are an expert HR data parsing assistant.
Extract interests, hobbies, and passions from the text into valid JSON.

JSON Structure:
{
  "items": ["Interest 1", "Interest 2"],
  "content": "Short narrative or description (or empty string)"
}
Return ONLY valid JSON.
""",
    "summary": """You are an expert HR data parsing assistant.
Extract candidate bio, professional summary, or about me narrative into valid JSON.

JSON Structure:
{
  "content": "Clean narrative summary"
}
Return ONLY valid JSON.
""",
}


def _is_education_entry(it: dict[str, Any]) -> bool:
    """Check if a project entry actually describes an educational background/degree."""
    if it.get("url") or (isinstance(it.get("technologies"), list) and len(it["technologies"]) > 0):
        return False

    name = str(it.get("name") or "").strip().lower()
    role = str(it.get("role") or "").strip().lower()
    desc = str(it.get("description") or "").strip().lower()
    combined = f"{name} {role} {desc}"

    software_terms = [
        "aplikacja",
        "platforma",
        "system monitorowania",
        "system zarządzania",
        "bot",
        "serwis",
        "portal",
        "homelab",
        "klaster",
        "biblioteka",
        "narzędzie",
        "plan zajęć",
        "gamevibes",
        "ancymon",
        "kandidflow",
    ]
    if any(term in name for term in software_terms):
        return False

    school_terms = [
        "politechnika",
        "uniwersytet",
        "zespół szkół",
        "technikum",
        "akademia górniczo",
        "szkoła główna",
        "uczelnia",
        "liceum",
    ]
    if any(term in name for term in school_terms):
        return True

    degree_name_terms = [
        "studia",
        "studia inżynierskie",
        "studia magisterskie",
        "studia licencjackie",
        "inżynier informatyki",
        "magister informatyki",
        "licencjat informatyki",
    ]
    if any(name.startswith(term) or name == term for term in degree_name_terms):
        return True

    degree_role_terms = ["inżynier", "magister", "licencjat", "technik", "student", "doktorant"]
    if any(role.startswith(term) for term in degree_role_terms) and any(
        term in combined for term in school_terms
    ):
        return True

    return False


def _is_certificate_entry(it: dict[str, Any]) -> bool:
    """Check if a project entry actually describes a certification or exam."""
    name = str(it.get("name") or "").strip().lower()
    role = str(it.get("role") or "").strip().lower()
    desc = str(it.get("description") or "").strip().lower()
    combined = f"{name} {role} {desc}"

    cert_terms = [
        "certyfikat",
        "certificate",
        "ccna",
        "cisco",
        "oke kraków",
        "oke ",
        "aws certified",
        "google cloud certified",
        "cka:",
        "ckad",
        "rhcsa",
        "azure certified",
        "comptia",
        "kwalifikacja",
        "kwalifikacje",
        "egzamin zawodowy",
    ]
    if any(
        term in name
        for term in [
            "certyfikat",
            "ccna",
            "oke",
            "aws certified",
            "google cloud certified",
            "cka",
            "ckad",
            "rhcsa",
            "kwalifikacj",
        ]
    ):
        return True

    if any(term in combined for term in cert_terms) and any(
        issuer in combined
        for issuer in ["cisco", "google", "amazon", "aws", "oke", "linux foundation", "red hat"]
    ):
        return True

    return False


def _is_experience_entry(it: dict[str, Any]) -> bool:
    """Check if a project entry actually describes an employment internship or job role."""
    name = str(it.get("name") or "").strip().lower()
    role = str(it.get("role") or "").strip().lower()
    desc = str(it.get("description") or "").strip().lower()
    combined = f"{name} {role} {desc}"

    if any(kw in role for kw in ["praktykant", "stażysta", "staż", "intern"]):
        return True

    if "mk systems" in combined:
        return True

    if any(kw in role for kw in ["developer", "engineer", "specjalista"]) and any(
        co in combined
        for co in [
            "mk systems",
            "sp. z o.o.",
            "inc.",
            "ltd",
            "gmbh",
            "firma",
            "solutions",
            "software house",
        ]
    ):
        return True

    return False


def _proj_to_education(it: dict[str, Any]) -> dict[str, Any]:
    """Convert a misplaced project dict to an EducationItem compliant dict."""
    name = str(it.get("name") or "").strip()
    role = str(it.get("role") or "").strip()
    desc = str(it.get("description") or "").strip()
    s_date = str(it.get("start_date") or "").strip()
    e_date = str(it.get("end_date") or "").strip()

    school_candidates = [
        "Politechnika Lubelska",
        "Zespół Szkół Elektronicznych w Lublinie",
        "Uniwersytet",
        "Politechnika",
        "Zespół Szkół",
    ]
    institution = name
    for cand in school_candidates:
        if cand.lower() in name.lower() or cand.lower() in desc.lower():
            if cand in ["Politechnika Lubelska", "Zespół Szkół Elektronicznych w Lublinie"]:
                institution = cand
            break

    degree = role
    if not degree or degree.lower() in ["twórca", "autor", "student", "specjalista", ""]:
        combined_text = f"{name} {desc}".lower()
        if "magister" in combined_text:
            degree = "Magister Inżynier"
        elif "inżynier" in combined_text:
            degree = "Inżynier"
        elif "technik" in combined_text:
            degree = "Technik Informatyk"
        else:
            degree = "Wykształcenie wyższe"

    field_of_study = "Informatyka" if "informatyk" in f"{name} {role} {desc}".lower() else ""

    return {
        "institution": institution,
        "degree": degree,
        "field_of_study": field_of_study,
        "start_date": s_date,
        "end_date": e_date,
    }


def _proj_to_certificate(it: dict[str, Any]) -> dict[str, Any]:
    """Convert a misplaced project dict to a CertificateItem compliant dict."""
    name = str(it.get("name") or "").strip()
    role = str(it.get("role") or "").strip()
    desc = str(it.get("description") or "").strip()
    s_date = str(it.get("start_date") or "").strip()
    e_date = str(it.get("end_date") or "").strip()

    issuer = role
    combined = f"{name} {role} {desc}".lower()
    if "cisco" in combined:
        issuer = "Cisco Networking Academy"
    elif "oke" in combined:
        issuer = "OKE Kraków"
    elif "google" in combined:
        issuer = "Google Cloud"
    elif "aws" in combined or "amazon" in combined:
        issuer = "Amazon Web Services"

    return {
        "name": name,
        "issuer": issuer,
        "issue_date": s_date or e_date,
    }


def _proj_to_experience(it: dict[str, Any]) -> dict[str, Any]:
    """Convert a misplaced project dict to an ExperienceItem compliant dict."""
    name = str(it.get("name") or "").strip()
    role = str(it.get("role") or "").strip()
    desc = str(it.get("description") or "").strip()
    s_date = str(it.get("start_date") or "").strip()
    e_date = str(it.get("end_date") or "").strip()

    combined = f"{name} {role} {desc}".lower()
    company = "Mk Systems" if "mk systems" in combined else name
    position = (
        role
        if ("praktyk" in role.lower() or "staż" in role.lower())
        else ("Praktykant" if "praktyk" in combined else "Stażysta")
    )

    highlights = [desc] if desc else []

    return {
        "position": position,
        "company": company,
        "location": "",
        "start_date": s_date,
        "end_date": e_date,
        "highlights": highlights,
    }


def _enforce_cross_section_guardrails(
    sections: list[dict[str, Any]],
    contact_info: dict[str, Any],
    raw_text: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Heuristic safety net enforcing section boundaries and backfilling contacts.

    Detects if any entry inside `projects` actually describes an education institution,
    certification, or employment internship, and safely relocates it to the
    appropriate section. Also backfills missing contact information from regex extraction.
    """
    regex_contacts = _extract_contact_info_regex(raw_text)
    for key in ["email", "phone", "location", "github", "linkedin", "portfolio"]:
        if not contact_info.get(key) and regex_contacts.get(key):
            contact_info[key] = regex_contacts[key]

    sec_map: dict[str, dict[str, Any]] = {
        s["id"]: s for s in sections if isinstance(s, dict) and "id" in s
    }

    for target_id in ("projects", "education", "certificates", "experience"):
        if target_id not in sec_map:
            sec_map[target_id] = copy.deepcopy(DEFAULT_SECTION_SKELETONS[target_id])
            sections.append(sec_map[target_id])

    proj_sec = sec_map.get("projects")
    if not proj_sec or not isinstance(proj_sec.get("items"), list):
        return _sanitize_parsed_sections(sections), contact_info

    edu_sec = sec_map["education"]
    cert_sec = sec_map["certificates"]
    exp_sec = sec_map["experience"]

    edu_items = edu_sec.setdefault("items", [])
    cert_items = cert_sec.setdefault("items", [])
    exp_items = exp_sec.setdefault("items", [])

    existing_edu_keys = {
        (
            str(it.get("institution", "")).strip().lower(),
            str(it.get("degree", "")).strip().lower(),
        )
        for it in edu_items
        if isinstance(it, dict)
    }
    existing_cert_keys = {
        str(it.get("name", "")).strip().lower() for it in cert_items if isinstance(it, dict)
    }
    existing_exp_keys = {
        (
            str(it.get("company", "")).strip().lower(),
            str(it.get("position", "")).strip().lower(),
        )
        for it in exp_items
        if isinstance(it, dict)
    }

    remaining_projects: list[dict[str, Any]] = []

    for it in proj_sec["items"]:
        if not isinstance(it, dict):
            continue

        if _is_education_entry(it):
            edu_item = _proj_to_education(it)
            key = (
                str(edu_item.get("institution", "")).strip().lower(),
                str(edu_item.get("degree", "")).strip().lower(),
            )
            if key != ("", "") and key not in existing_edu_keys:
                edu_items.append(edu_item)
                existing_edu_keys.add(key)
            continue

        if _is_certificate_entry(it):
            cert_item = _proj_to_certificate(it)
            key = str(cert_item.get("name", "")).strip().lower()
            if key and key not in existing_cert_keys:
                cert_items.append(cert_item)
                existing_cert_keys.add(key)
            continue

        if _is_experience_entry(it):
            exp_item = _proj_to_experience(it)
            key = (
                str(exp_item.get("company", "")).strip().lower(),
                str(exp_item.get("position", "")).strip().lower(),
            )
            if key != ("", "") and key not in existing_exp_keys:
                exp_items.append(exp_item)
                existing_exp_keys.add(key)
            continue

        remaining_projects.append(it)

    proj_sec["items"] = remaining_projects

    sanitized = _sanitize_parsed_sections(sections)
    return sanitized, contact_info


class CandidateParser:
    """Service handling candidate profile reset and AI extraction / merging."""

    @staticmethod
    async def get_or_create_candidate(db: AsyncSession) -> CandidateProfile:
        """Fetch singleton candidate profile or initialize baseline."""
        stmt = select(CandidateProfile).limit(1)
        result = await db.execute(stmt)
        candidate = result.scalar_one_or_none()

        if not candidate:
            default_data = copy.deepcopy(DEFAULT_CANDIDATE_DATA)
            candidate = CandidateProfile(
                id=uuid.uuid4(),
                full_name=default_data["full_name"],
                contact_info=default_data["contact_info"],
                sections=default_data["sections"],
                default_sections=default_data["default_sections"],
            )
            db.add(candidate)
            await db.commit()
            await db.refresh(candidate)

        return candidate

    @staticmethod
    async def reset_to_default(db: AsyncSession) -> CandidateProfile:
        """Reset candidate profile to baseline default data."""
        stmt = select(CandidateProfile).limit(1)
        result = await db.execute(stmt)
        candidate = result.scalar_one_or_none()

        default_data = copy.deepcopy(DEFAULT_CANDIDATE_DATA)

        if not candidate:
            candidate = CandidateProfile(
                id=uuid.uuid4(),
                full_name=default_data["full_name"],
                contact_info=default_data["contact_info"],
                sections=default_data["sections"],
                default_sections=default_data["default_sections"],
            )
            db.add(candidate)
        else:
            candidate.full_name = default_data["full_name"]
            candidate.contact_info = default_data["contact_info"]
            candidate.sections = default_data["sections"]
            candidate.default_sections = default_data["default_sections"]
            flag_modified(candidate, "contact_info")
            flag_modified(candidate, "sections")
            flag_modified(candidate, "default_sections")

        await db.commit()
        await db.refresh(candidate)
        logger.info("Candidate profile reset to default successfully")
        return candidate

    @classmethod
    async def _parse_segmented_sections(
        cls,
        segments: dict[str, str],
        request: CandidateAIFillRequest,
    ) -> tuple[list[dict[str, Any]], str | None]:
        """Parse segmented sections using isolated mini-prompts and fast-path heuristics."""
        raw_sections: list[dict[str, Any]] = []
        extracted_name: str | None = None

        provider_arg = None if request.llm_provider == "default" else request.llm_provider

        # Check header text for candidate name
        header_text = segments.get("header", "")
        if header_text:
            m_h1 = re.search(
                r"^#\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:[ \t]+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)+)",
                header_text,
                re.MULTILINE,
            )
            if m_h1:
                extracted_name = m_h1.group(1).strip()

        # Fast-path 1: RODO clause
        if "clause" in segments:
            clause_text = segments["clause"].strip()
            clause_clean = re.sub(r"^[-*•]\s*", "", clause_text).strip()
            raw_sections.append(
                {
                    "id": "clause",
                    "type": "clause",
                    "title": "Klauzula RODO",
                    "content": clause_clean,
                }
            )

        # Fast-path 2: Summary if contains blockquote or simple narrative
        if "summary" in segments:
            sum_text = segments["summary"].strip()
            quote_lines = [
                re.sub(r"^>\s*", "", line).strip()
                for line in sum_text.splitlines()
                if line.strip().startswith(">")
            ]
            extracted_quote = " ".join(line for line in quote_lines if line).strip()
            if extracted_quote and len(extracted_quote) > 30:
                raw_sections.append(
                    {
                        "id": "summary",
                        "type": "summary",
                        "title": "O mnie",
                        "content": extracted_quote,
                    }
                )
            elif not re.search(r"^[-*•]\s+", sum_text, re.MULTILINE):
                raw_sections.append(
                    {
                        "id": "summary",
                        "type": "summary",
                        "title": "O mnie",
                        "content": sum_text,
                    }
                )

        # Structured sections to extract via isolated LLM prompts
        parsed_ids = {s["id"] for s in raw_sections}
        sections_to_query = [
            sec_id
            for sec_id in segments
            if sec_id in SECTION_PROMPTS and sec_id not in parsed_ids and segments[sec_id].strip()
        ]

        async def _call_section_llm(sec_id: str) -> dict[str, Any] | None:
            sec_text = segments[sec_id]
            prompt = SECTION_PROMPTS[sec_id]
            try:
                res = await llm_client.generate_json(
                    system_prompt=prompt,
                    user_prompt=sec_text,
                    provider=provider_arg,
                    model=request.llm_model,
                    api_key=request.api_key,
                    enable_thinking=request.enable_thinking,
                    context_window=request.context_window,
                )
                if not isinstance(res, (dict, list)):
                    return None

                if isinstance(res, list):
                    return {"id": sec_id, "type": sec_id, "items": res}

                sec_dict = dict(res)
                sec_dict.setdefault("id", sec_id)
                sec_dict.setdefault("type", sec_id)
                return sec_dict
            except Exception as err:
                logger.warning("LLM extraction failed for section '%s': %s", sec_id, err)
                return None

        if sections_to_query:
            # Throttle concurrency for local models (e.g. Ollama) to avoid GPU starvation / timeouts
            concurrency_limit = (
                1 if (provider_arg in ("local", "ollama") or provider_arg is None) else 3
            )
            sem = asyncio.Semaphore(concurrency_limit)

            async def _throttled_call(s_id: str) -> dict[str, Any] | None:
                async with sem:
                    return await _call_section_llm(s_id)

            tasks = [_throttled_call(sec_id) for sec_id in sections_to_query]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for res in results:
                if isinstance(res, dict) and "id" in res:
                    raw_sections.append(res)
                elif isinstance(res, Exception):
                    logger.warning("Section extraction task error: %s", res)

        return raw_sections, extracted_name

    @classmethod
    async def parse_and_apply(
        cls, request: CandidateAIFillRequest, db: AsyncSession
    ) -> CandidateProfile:
        """Parse raw text via LLM and apply extracted data in replace or merge mode."""
        candidate = await cls.get_or_create_candidate(db)

        # 1. Deterministic regex extraction of contact info & name
        regex_contact = _extract_contact_info_regex(request.text)

        # 2. Text pre-segmentation
        segments = _segment_raw_text(request.text)
        recognized_standard_sections = [
            sec_id for sec_id in segments if sec_id in STANDARD_SECTION_ORDER
        ]

        raw_name: str | None = regex_contact.get("full_name")
        raw_contact: dict[str, Any] = {
            k: v for k, v in regex_contact.items() if k != "full_name" and v is not None
        }

        if len(recognized_standard_sections) >= 2:
            raw_sections, seg_name = await cls._parse_segmented_sections(
                segments=segments,
                request=request,
            )
            if seg_name and not raw_name:
                raw_name = seg_name
        else:
            provider_arg = None if request.llm_provider == "default" else request.llm_provider
            parsed_data = await llm_client.generate_json(
                system_prompt=CANDIDATE_PARSER_SYSTEM_PROMPT,
                user_prompt=request.text,
                provider=provider_arg,
                model=request.llm_model,
                api_key=request.api_key,
                enable_thinking=request.enable_thinking,
                context_window=request.context_window,
            )

            if not isinstance(parsed_data, dict):
                parsed_data = {}

            if not raw_name:
                raw_name = parsed_data.get("full_name")

            llm_contact = parsed_data.get("contact_info") or {}
            for k in ["email", "phone", "location", "github", "linkedin", "portfolio"]:
                if not raw_contact.get(k) and llm_contact.get(k):
                    raw_contact[k] = llm_contact.get(k)

            raw_sections = _extract_raw_sections(parsed_data)

        sanitized_sections = _sanitize_parsed_sections(raw_sections)

        # 3. Post-processing Guardrails (Relocate misplaced projects & backfill contacts)
        sanitized_sections, raw_contact = _enforce_cross_section_guardrails(
            sections=sanitized_sections,
            contact_info=raw_contact,
            raw_text=request.text,
        )

        if request.mode == "replace":
            if raw_name and str(raw_name).strip():
                candidate.full_name = str(raw_name).strip()

            contact_obj = CandidateContactInfo(
                email=raw_contact.get("email"),
                phone=raw_contact.get("phone"),
                location=raw_contact.get("location"),
                github=raw_contact.get("github"),
                linkedin=raw_contact.get("linkedin"),
                portfolio=raw_contact.get("portfolio"),
            )
            candidate.contact_info = contact_obj.model_dump(mode="json")
            candidate.sections = sanitized_sections
            candidate.default_sections = STANDARD_SECTION_ORDER
            flag_modified(candidate, "default_sections")

        else:
            # Mode == "merge"
            if raw_name and str(raw_name).strip():
                candidate.full_name = str(raw_name).strip()

            current_contact = dict(candidate.contact_info or {})
            for key in ["email", "phone", "location", "github", "linkedin", "portfolio"]:
                val = raw_contact.get(key)
                if val and str(val).strip():
                    current_contact[key] = str(val).strip()
            candidate.contact_info = current_contact

            current_sections = list(candidate.sections or [])
            # 1. Ensure all 7 standard sections are present in current_sections
            existing_sec_ids = {
                s.get("id") for s in current_sections if isinstance(s, dict) and "id" in s
            }
            for sec_id in STANDARD_SECTION_ORDER:
                if sec_id not in existing_sec_ids:
                    current_sections.append(copy.deepcopy(DEFAULT_SECTION_SKELETONS[sec_id]))

            sections_by_id: dict[str, dict[str, Any]] = {
                s["id"]: s for s in current_sections if isinstance(s, dict) and "id" in s
            }

            for new_sec in sanitized_sections:
                sec_id = new_sec.get("id")
                if not sec_id or sec_id not in sections_by_id:
                    continue

                curr_sec = sections_by_id[sec_id]

                if sec_id == "summary":
                    new_content = str(new_sec.get("content") or "").strip()
                    if new_content:
                        curr_sec["content"] = new_content

                elif sec_id == "skills":
                    new_items = new_sec.get("items", [])
                    if new_items:
                        curr_items = curr_sec.setdefault("items", [])
                        cat_map = {
                            it.get("category", "").strip().lower(): it
                            for it in curr_items
                            if isinstance(it, dict)
                        }

                        for new_cat in new_items:
                            cat_name = str(new_cat.get("category") or "").strip()
                            cat_key = cat_name.lower()
                            new_skills = [
                                str(s).strip() for s in new_cat.get("skills", []) if str(s).strip()
                            ]
                            if not new_skills:
                                continue

                            if cat_key in cat_map:
                                target_cat = cat_map[cat_key]
                                existing_skills_lower = {
                                    str(s).strip().lower() for s in target_cat.get("skills", [])
                                }
                                for skill in new_skills:
                                    if skill.lower() not in existing_skills_lower:
                                        target_cat.setdefault("skills", []).append(skill)
                                        existing_skills_lower.add(skill.lower())
                            else:
                                curr_items.append({"category": cat_name, "skills": new_skills})
                                cat_map[cat_key] = curr_items[-1]

                elif sec_id == "experience":
                    new_items = new_sec.get("items", [])
                    if new_items:
                        curr_items = curr_sec.setdefault("items", [])
                        existing_keys = {
                            (
                                str(it.get("company", "")).strip().lower(),
                                str(it.get("position", "")).strip().lower(),
                            )
                            for it in curr_items
                            if isinstance(it, dict)
                        }
                        for new_item in new_items:
                            key = (
                                str(new_item.get("company", "")).strip().lower(),
                                str(new_item.get("position", "")).strip().lower(),
                            )
                            if key != ("", "") and key not in existing_keys:
                                curr_items.append(new_item)
                                existing_keys.add(key)

                elif sec_id == "projects":
                    new_items = new_sec.get("items", [])
                    if new_items:
                        curr_items = curr_sec.setdefault("items", [])
                        existing_keys = {
                            str(it.get("name", "")).strip().lower()
                            for it in curr_items
                            if isinstance(it, dict)
                        }
                        for new_item in new_items:
                            key = str(new_item.get("name", "")).strip().lower()
                            if key and key not in existing_keys:
                                curr_items.append(new_item)
                                existing_keys.add(key)

                elif sec_id == "education":
                    new_items = new_sec.get("items", [])
                    if new_items:
                        curr_items = curr_sec.setdefault("items", [])
                        existing_keys = {
                            (
                                str(it.get("institution", "")).strip().lower(),
                                str(it.get("degree", "")).strip().lower(),
                            )
                            for it in curr_items
                            if isinstance(it, dict)
                        }
                        for new_item in new_items:
                            key = (
                                str(new_item.get("institution", "")).strip().lower(),
                                str(new_item.get("degree", "")).strip().lower(),
                            )
                            if key != ("", "") and key not in existing_keys:
                                curr_items.append(new_item)
                                existing_keys.add(key)

                elif sec_id == "certificates":
                    new_items = new_sec.get("items", [])
                    if new_items:
                        curr_items = curr_sec.setdefault("items", [])
                        existing_keys = {
                            str(it.get("name", "")).strip().lower()
                            for it in curr_items
                            if isinstance(it, dict)
                        }
                        for new_item in new_items:
                            key = str(new_item.get("name", "")).strip().lower()
                            if key and key not in existing_keys:
                                curr_items.append(new_item)
                                existing_keys.add(key)

                elif sec_id == "languages":
                    new_items = new_sec.get("items", [])
                    if new_items:
                        curr_items = curr_sec.setdefault("items", [])
                        existing_keys = {
                            str(it.get("name", "")).strip().lower()
                            for it in curr_items
                            if isinstance(it, dict)
                        }
                        for new_item in new_items:
                            key = str(new_item.get("name", "")).strip().lower()
                            if key and key not in existing_keys:
                                curr_items.append(new_item)
                                existing_keys.add(key)

                elif sec_id == "trainings":
                    new_items = new_sec.get("items", [])
                    if new_items:
                        curr_items = curr_sec.setdefault("items", [])
                        existing_keys = {
                            str(it.get("name", "")).strip().lower()
                            for it in curr_items
                            if isinstance(it, dict)
                        }
                        for new_item in new_items:
                            key = str(new_item.get("name", "")).strip().lower()
                            if key and key not in existing_keys:
                                curr_items.append(new_item)
                                existing_keys.add(key)

                elif sec_id == "achievements":
                    new_items = new_sec.get("items", [])
                    if new_items:
                        curr_items = curr_sec.setdefault("items", [])
                        existing_keys = {
                            str(it.get("title", "")).strip().lower()
                            for it in curr_items
                            if isinstance(it, dict)
                        }
                        for new_item in new_items:
                            key = str(new_item.get("title", "")).strip().lower()
                            if key and key not in existing_keys:
                                curr_items.append(new_item)
                                existing_keys.add(key)

                elif sec_id == "interests":
                    new_items = new_sec.get("items", [])
                    if new_items:
                        curr_items = curr_sec.setdefault("items", [])
                        existing_items_lower = {
                            str(it).strip().lower() for it in curr_items if str(it).strip()
                        }
                        for item_str in new_items:
                            s_val = str(item_str).strip()
                            if s_val and s_val.lower() not in existing_items_lower:
                                curr_items.append(s_val)
                                existing_items_lower.add(s_val.lower())
                    new_content = str(new_sec.get("content") or "").strip()
                    if new_content:
                        curr_sec["content"] = new_content

                elif sec_id == "clause":
                    new_content = str(new_sec.get("content") or "").strip()
                    if new_content:
                        curr_sec["content"] = new_content

            order_index = {sec_id: idx for idx, sec_id in enumerate(STANDARD_SECTION_ORDER)}
            current_sections.sort(key=lambda s: order_index.get(s.get("id", ""), 999))
            candidate.sections = current_sections

        flag_modified(candidate, "contact_info")
        flag_modified(candidate, "sections")
        await db.commit()
        await db.refresh(candidate)
        logger.info(
            "Candidate profile updated via AI fill (mode=%s) for %s",
            request.mode,
            candidate.full_name,
        )
        return candidate


candidate_parser = CandidateParser()
