import asyncio
import logging
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Ensure /app is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.candidate import CandidateProfile
from app.models.job import JobOffer
from app.models.preset import BaseCVPreset
from app.models.settings import AppSettings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_dev")


async def seed() -> None:
    """Populate database with development mock data."""
    async with async_session_factory() as session:
        # 1. Initialize App Settings
        stmt_settings = select(AppSettings).where(AppSettings.id == 1)
        res_settings = await session.execute(stmt_settings)
        app_setting = res_settings.scalar_one_or_none()

        if not app_setting:
            app_setting = AppSettings(
                id=1,
                auto_parse_mode=settings.AUTO_PARSE_MODE,
                ollama_base_url=settings.OLLAMA_BASE_URL,
                ollama_model=settings.OLLAMA_MODEL,
                api_provider=settings.API_PROVIDER,
                api_model=settings.API_MODEL,
                extension_api_token=settings.EXTENSION_API_TOKEN,
            )
            session.add(app_setting)
            logger.info("Created app_settings record")
        else:
            logger.info("app_settings already present")

        # 2. Seed Candidate Profile
        stmt_cand = select(CandidateProfile).limit(1)
        res_cand = await session.execute(stmt_cand)
        candidate = res_cand.scalar_one_or_none()

        candidate_data = {
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
                    "title": "Podsumowanie zawodowe",
                    "content": (
                        "Junior DevOps / Platform Engineer z praktycznym doświadczeniem "
                        "w automatyzacji CI/CD, konteneryzacji Docker oraz orkiestracji "
                        "Kubernetes. Pasjonat kultury GitOps oraz infrastruktury jako kodu (IaC)."
                    ),
                },
                {
                    "id": "skills",
                    "type": "skills",
                    "title": "Umiejętności techniczne",
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
                            "description": (
                                "Klaster K3s zarządzany w podejściu GitOps z ArgoCD i Helm."
                            ),
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

        if not candidate:
            candidate = CandidateProfile(
                id=uuid.uuid4(),
                full_name=candidate_data["full_name"],
                contact_info=candidate_data["contact_info"],
                sections=candidate_data["sections"],
                default_sections=candidate_data["default_sections"],
            )
            session.add(candidate)
            logger.info("Created CandidateProfile for %s", candidate.full_name)
        else:
            candidate.full_name = candidate_data["full_name"]
            candidate.contact_info = candidate_data["contact_info"]
            candidate.sections = candidate_data["sections"]
            candidate.default_sections = candidate_data["default_sections"]
            logger.info("Updated existing CandidateProfile for %s", candidate.full_name)

        # 3. Seed Base CV Presets (Archetypes)
        presets_data = [
            {
                "title": "Junior DevOps Engineer",
                "language": "pl",
                "layout_schema": [
                    {
                        "id": "summary",
                        "type": "summary",
                        "title": "Podsumowanie zawodowe",
                        "content": (
                            "Inżynier DevOps zorientowany na automatyzację CI/CD, konteneryzację "
                            "i architekturę chmurową AWS/Kubernetes."
                        ),
                    },
                    {
                        "id": "skills",
                        "type": "skills",
                        "title": "Umiejętności techniczne",
                        "items": [
                            {
                                "category": "DevOps & Cloud",
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
                                "skills": ["GitHub Actions", "Prometheus", "Grafana"],
                            },
                            {
                                "category": "Języki",
                                "skills": ["Python", "Bash", "SQL"],
                            },
                        ],
                    },
                    {
                        "id": "experience",
                        "type": "experience",
                        "title": "Doświadczenie zawodowe",
                        "items": [
                            {
                                "position": "Junior DevOps Specialist",
                                "company": "CloudScale Solutions",
                                "location": "Warszawa",
                                "start_date": "2023-04",
                                "end_date": "present",
                                "highlights": [
                                    "Zarządzanie klastrami K8s w środowisku AWS.",
                                    "Automatyzacja procesów CI/CD w GitHub Actions.",
                                ],
                            }
                        ],
                    },
                    {
                        "id": "projects",
                        "type": "projects",
                        "title": "Projekty",
                        "items": [
                            {
                                "name": "KandidFlow Platform",
                                "role": "DevOps Lead",
                                "url": "github.com/Adamad7/kandid-flow",
                                "start_date": "2024",
                                "end_date": "present",
                                "description": (
                                    "Infrastruktura i konteneryzacja platformy rekrutacyjnej."
                                ),
                                "technologies": ["Docker", "PostgreSQL", "GitHub Actions"],
                            }
                        ],
                    },
                    {
                        "id": "clause",
                        "type": "clause",
                        "title": "Klauzula RODO",
                        "content": (
                            "Wyrażam zgodę na przetwarzanie moich danych osobowych "
                            "dla potrzeb niezbędnych do rekrutacji zgodnie z RODO."
                        ),
                    },
                ],
            },
            {
                "title": "Flutter Developer",
                "language": "pl",
                "layout_schema": [
                    {
                        "id": "summary",
                        "type": "summary",
                        "title": "Podsumowanie zawodowe",
                        "content": (
                            "Programista aplikacji mobilnych Flutter z doświadczeniem "
                            "w budowaniu responsywnych aplikacji wieloplatformowych (iOS/Android) "
                            "oraz architekturze BLoC/Clean Architecture."
                        ),
                    },
                    {
                        "id": "skills",
                        "type": "skills",
                        "title": "Umiejętności techniczne",
                        "items": [
                            {
                                "category": "Mobile & Frontend",
                                "skills": [
                                    "Flutter",
                                    "Dart",
                                    "BLoC",
                                    "Riverpod",
                                    "Clean Architecture",
                                ],
                            },
                            {
                                "category": "Integracje & Backend",
                                "skills": ["REST API", "Firebase", "SQLite", "Git"],
                            },
                        ],
                    },
                    {
                        "id": "experience",
                        "type": "experience",
                        "title": "Doświadczenie zawodowe",
                        "items": [
                            {
                                "position": "Mobile Flutter Developer",
                                "company": "AppCraft Studio",
                                "location": "Zdalnie",
                                "start_date": "2023-01",
                                "end_date": "present",
                                "highlights": [
                                    "Rozwój aplikacji mobilnych na platformy Android i iOS.",
                                    "Integracja zewnętrznych API oraz powiadomień Firebase Push.",
                                ],
                            }
                        ],
                    },
                    {
                        "id": "projects",
                        "type": "projects",
                        "title": "Projekty",
                        "items": [
                            {
                                "name": "FitTracker Mobile",
                                "role": "Lead Mobile Developer",
                                "url": "github.com/jankowalski/fittracker-flutter",
                                "start_date": "2023",
                                "end_date": "2024",
                                "description": (
                                    "Wieloplatformowa aplikacja do śledzenia aktywności fizycznej."
                                ),
                                "technologies": ["Flutter", "Dart", "BLoC", "Firebase"],
                            }
                        ],
                    },
                    {
                        "id": "clause",
                        "type": "clause",
                        "title": "Klauzula RODO",
                        "content": (
                            "Wyrażam zgodę na przetwarzanie moich danych osobowych "
                            "dla potrzeb niezbędnych do rekrutacji zgodnie z RODO."
                        ),
                    },
                ],
            },
        ]

        for p_data in presets_data:
            stmt_p = select(BaseCVPreset).where(BaseCVPreset.title == p_data["title"])
            res_p = await session.execute(stmt_p)
            existing_p = res_p.scalar_one_or_none()
            if not existing_p:
                new_preset = BaseCVPreset(
                    title=p_data["title"],
                    language=p_data["language"],
                    layout_schema=p_data["layout_schema"],
                )
                session.add(new_preset)
                logger.info("Created BaseCVPreset: %s", new_preset.title)
            else:
                existing_p.layout_schema = p_data["layout_schema"]
                logger.info("Updated existing BaseCVPreset: %s", existing_p.title)

        # 4. Seed Sample Job Offer
        stmt_job = select(JobOffer).where(
            JobOffer.source_url == "https://justjoin.it/offers/cloudscale-junior-devops-engineer"
        )
        res_job = await session.execute(stmt_job)
        job = res_job.scalar_one_or_none()

        if not job:
            job = JobOffer(
                id=uuid.uuid4(),
                source_url="https://justjoin.it/offers/cloudscale-junior-devops-engineer",
                source_portal="justjoin",
                company_name="CloudScale Solutions",
                role_title="Junior DevOps / Platform Engineer",
                status="ready",
                language="pl",
                work_model="hybrid",
                work_model_details="Hybrydowo: 1 dzień w tygodniu w biurze w Warszawie",
                locations=["Warszawa"],
                location_raw="Warszawa, Mazowieckie",
                salary_min=8000,
                salary_max=12000,
                salary_currency="PLN",
                contract_type="B2B",
                notes="Oferta z naciskiem na AWS i Kubernetes. Warto podkreślić CKA.",
                raw_payload={
                    "source_url": "https://justjoin.it/offers/cloudscale-junior-devops-engineer",
                    "source_portal": "justjoin",
                    "title": "Junior DevOps / Platform Engineer",
                    "company": "CloudScale Solutions",
                    "locations": ["Warszawa"],
                    "work_model": "hybrid",
                    "salary_min": 8000,
                    "salary_max": 12000,
                },
                structured_data={
                    "must_have": ["Docker", "Kubernetes", "Linux", "Git", "CI/CD"],
                    "nice_to_have": ["Terraform", "AWS", "Prometheus", "Python"],
                    "summary": "Inżynier platformowy wspierający migrację systemów do chmury.",
                },
                created_at=datetime.now(),
            )
            session.add(job)
            logger.info("Created sample JobOffer: %s (%s)", job.role_title, job.company_name)
        else:
            logger.info("Sample JobOffer already present")

        await session.commit()
        logger.info("Seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
