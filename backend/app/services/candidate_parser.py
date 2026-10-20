"""Candidate Knowledge Base parser and default seeder service."""

import copy
import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.candidate import CandidateProfile
from app.schemas.candidate import (
    CandidateAIFillRequest,
    CandidateContactInfo,
    CertificateItem,
    CertificatesSectionBlock,
    ClauseSectionBlock,
    EducationItem,
    EducationSectionBlock,
    ExperienceItem,
    ExperienceSectionBlock,
    ProjectItem,
    ProjectsSectionBlock,
    SkillCategoryItem,
    SkillsSectionBlock,
    SummarySectionBlock,
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
      "id": "clause",
      "type": "clause",
      "title": "Klauzula RODO",
      "content": "RODO / GDPR consent clause text"
    }
  ]
}

STRICT SECTION MANDATE:
- The JSON response MUST ALWAYS contain ALL 7 standard sections in the "sections" array:
  "summary", "skills", "experience", "projects", "education", "certificates", "clause".
- Even if data for a section is missing from the input, you MUST STILL return that section
  with an empty array `items: []` or empty string `content: ""`. NEVER omit any of the 7 sections.

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
    async def parse_and_apply(
        cls, request: CandidateAIFillRequest, db: AsyncSession
    ) -> CandidateProfile:
        """Parse raw text via LLM and apply extracted data in replace or merge mode."""
        candidate = await cls.get_or_create_candidate(db)

        provider_arg = None if request.llm_provider == "default" else request.llm_provider
        parsed_data = await llm_client.generate_json(
            system_prompt=CANDIDATE_PARSER_SYSTEM_PROMPT,
            user_prompt=request.text,
            provider=provider_arg,
            model=request.llm_model,
            api_key=request.api_key,
            enable_thinking=request.enable_thinking,
        )

        if not isinstance(parsed_data, dict):
            parsed_data = {}

        raw_name = parsed_data.get("full_name")
        raw_contact = parsed_data.get("contact_info") or {}
        raw_sections = _extract_raw_sections(parsed_data)

        sanitized_sections = _sanitize_parsed_sections(raw_sections)

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

                elif sec_id == "clause":
                    new_content = str(new_sec.get("content") or "").strip()
                    if new_content and not str(curr_sec.get("content") or "").strip():
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
