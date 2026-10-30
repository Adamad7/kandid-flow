"""Comprehensive tests for Candidate Knowledge Base Hybrid Parser and Guardrails."""

from typing import Any
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.schemas.candidate import CandidateAIFillRequest
from app.services.candidate_parser import (
    CandidateParser,
    _enforce_cross_section_guardrails,
    _extract_contact_info_regex,
    _segment_raw_text,
)
from tests.conftest import test_session_factory as db_session_factory

SAMPLE_USER_KB_MARKDOWN = """# Jan Kowalski
Email: jan.kowalski@example.com
Telefon: +48 500 123 456
GitHub: github.com/jankowalski
LinkedIn: linkedin.com/in/jankowalski
Lokalizacja: Lublin, Polska

## O mnie
Doświadczony inżynier oprogramowania i DevOps. Pasjonat konteneryzacji i automatyzacji.

## Wykształcenie
- Zespół Szkół Elektronicznych w Lublinie, Technik Informatyk (2016 - 2020)
- Politechnika Lubelska, Inżynier Informatyki (2020 - 2024)
- Politechnika Lubelska, Magister Inżynier Informatyki (2024 - obecnie)

## Doświadczenie zawodowe
- Praktykant w firmie Mk Systems (2021-07 - 2021-09)
  Konfiguracja sieci firmowych, konfiguracja serwerów Linux.

## Projekty
- Homelab K3s: Domowe środowisko laboratoryjne oparte o k3s i Proxmox.
- LAN & Firewall Configuration: Wdrożenie OPNsense i segmentacja sieci VLAN.
- Plan zajęć: Aplikacja mobilna do planowania zajęć dla studentów Politechniki Lubelskiej.
- GameVibes: Platforma społecznościowa dla graczy z silnikiem rekomendacji gier.
- K8s Cluster Monitoring: Prometheus, Grafana i Alertmanager w klastrze Bare-metal.
- AncyMon: System monitorowania maszyn wirtualnych i usług w sieci lokalnej.
- KandidFlow: Platforma automatyzacji rekrutacji IT oparta na FastAPI i React.

## Certyfikaty
- CCNA: Introduction to Networks (Cisco Networking Academy, 2022)
- E.12, E.13, E.14 (OKE Kraków, 2020)
- Google Cloud Certified Associate Cloud Engineer (Google, 2023)

## Umiejętności
- Platform & Cloud: Docker, Kubernetes, Linux, AWS, Proxmox
- Backend & DevOps: Python, FastAPI, CI/CD, Git, PostgreSQL

## Języki
- Polski: Ojczysty (Native)
- Angielski: B2/C1

## Klauzula RODO
Wyrażam zgodę na przetwarzanie moich danych osobowych dla potrzeb rekrutacji.
"""


def test_extract_contact_info_regex() -> None:
    """Test deterministic contact extraction from text."""
    text = (
        "# Jan Kowalski\n"
        "Kontakt:\n"
        "Email: jan.kowalski@example.com\n"
        "Tel: +48 500 123 456\n"
        "GitHub: https://github.com/jankowalski\n"
        "LinkedIn: https://www.linkedin.com/in/jankowalski\n"
        "Portfolio: https://jankowalski.dev\n"
        "Lokalizacja: Lublin, Polska\n"
    )

    info = _extract_contact_info_regex(text)
    assert info["full_name"] == "Jan Kowalski"
    assert info["email"] == "jan.kowalski@example.com"
    assert info["phone"] == "+48 500 123 456"
    assert info["github"] == "github.com/jankowalski"
    assert info["linkedin"] == "linkedin.com/in/jankowalski"
    assert info["portfolio"] == "https://jankowalski.dev"
    assert info["location"] == "Lublin, Polska"


def test_extract_contact_info_regex_alternative_formats() -> None:
    """Test contact extraction with 9-digit unseparated phones and clean handles."""
    text = (
        "Imię i nazwisko: Anna Maria Nowak\n"
        "Adres pocztowy: anna.nowak@poczta.onet.pl\n"
        "Telefon komórkowy: 601999888\n"
        "Profil: github.com/annanowak\n"
        "Profil zawodowy: linkedin.com/in/anna-nowak-123\n"
    )

    info = _extract_contact_info_regex(text)
    assert info["full_name"] == "Anna Maria Nowak"
    assert info["email"] == "anna.nowak@poczta.onet.pl"
    assert info["phone"] == "601999888"
    assert info["github"] == "github.com/annanowak"
    assert info["linkedin"] == "linkedin.com/in/anna-nowak-123"


def test_segment_raw_text_markdown_headings() -> None:
    """Test segmentation with markdown headings and nested subheadings."""
    segments = _segment_raw_text(SAMPLE_USER_KB_MARKDOWN)

    assert "header" in segments
    assert "Jan Kowalski" in segments["header"]

    assert "summary" in segments
    assert "Doświadczony inżynier" in segments["summary"]

    assert "education" in segments
    assert "Politechnika Lubelska" in segments["education"]
    assert "Zespół Szkół Elektronicznych" in segments["education"]

    assert "experience" in segments
    assert "Mk Systems" in segments["experience"]

    assert "projects" in segments
    assert "Homelab K3s" in segments["projects"]
    assert "AncyMon" in segments["projects"]
    assert "KandidFlow" in segments["projects"]

    assert "certificates" in segments
    assert "CCNA" in segments["certificates"]
    assert "OKE Kraków" in segments["certificates"]

    assert "skills" in segments
    assert "Docker, Kubernetes" in segments["skills"]

    assert "languages" in segments
    assert "Angielski: B2/C1" in segments["languages"]

    assert "clause" in segments
    assert "Wyrażam zgodę" in segments["clause"]


def test_segment_raw_text_uppercase_labels() -> None:
    """Test segmentation with uppercase labels and colons."""
    text = (
        "WYKSZTAŁCENIE:\n"
        "Politechnika Warszawska\n\n"
        "DOŚWIADCZENIE ZAWODOWE:\n"
        "Software Engineer w ABC Corp\n\n"
        "PROJEKTY:\n"
        "System CRM w Django\n\n"
        "UMIEJĘTNOŚCI:\n"
        "Python, Django, PostgreSQL\n"
    )
    segments = _segment_raw_text(text)
    assert "education" in segments
    assert "Politechnika Warszawska" in segments["education"]
    assert "experience" in segments
    assert "ABC Corp" in segments["experience"]
    assert "projects" in segments
    assert "System CRM" in segments["projects"]
    assert "skills" in segments
    assert "Python, Django" in segments["skills"]


def test_enforce_cross_section_guardrails_relocates_misclassified_projects() -> None:
    """Test guardrails relocating schools, certificates, and internships from projects."""
    misclassified_sections = [
        {"id": "summary", "type": "summary", "title": "O mnie", "content": "Opis kandydata"},
        {
            "id": "projects",
            "type": "projects",
            "title": "Projekty",
            "items": [
                # Misclassified Education items
                {
                    "name": "Zespół Szkół Elektronicznych w Lublinie",
                    "role": "Technik Informatyk",
                    "description": "Technik Informatyk (2016-2020)",
                    "start_date": "2016",
                    "end_date": "2020",
                },
                {
                    "name": "Politechnika Lubelska",
                    "role": "Inżynier Informatyki",
                    "description": "Studia I stopnia",
                    "start_date": "2020",
                    "end_date": "2024",
                },
                {
                    "name": "Politechnika Lubelska",
                    "role": "Magister Inżynier Informatyki",
                    "description": "Studia II stopnia",
                    "start_date": "2024",
                    "end_date": "present",
                },
                # Misclassified Experience item
                {
                    "name": "Mk Systems",
                    "role": "Praktykant",
                    "description": "Konfiguracja sieci i serwerów.",
                    "start_date": "2021-07",
                    "end_date": "2021-09",
                },
                # Misclassified Certificates
                {
                    "name": "CCNA: Introduction to Networks",
                    "role": "Cisco Networking Academy",
                    "description": "Certyfikat Cisco",
                    "start_date": "2022",
                },
                {
                    "name": "Kwalifikacje zawodowe E.12, E.13, E.14",
                    "role": "OKE Kraków",
                    "description": "Egzaminy OKE",
                    "start_date": "2020",
                },
                {
                    "name": "Google Cloud Certified Associate Cloud Engineer",
                    "role": "Google",
                    "description": "Certyfikat chmurowy GCP",
                    "start_date": "2023",
                },
                # Legitimate projects that MUST remain
                {
                    "name": "Homelab K3s",
                    "role": "Twórca",
                    "description": "Domowe środowisko laboratoryjne.",
                    "technologies": ["k3s", "Linux"],
                },
                {
                    "name": "LAN & Firewall Configuration",
                    "role": "Twórca",
                    "description": "Wdrożenie OPNsense i VLAN.",
                    "technologies": ["OPNsense", "Networking"],
                },
                {
                    "name": "Plan zajęć",
                    "role": "Twórca",
                    "description": "Aplikacja dla studentów Politechniki.",
                    "technologies": ["Flutter"],
                },
                {
                    "name": "GameVibes",
                    "role": "Twórca",
                    "description": "Platforma społecznościowa dla graczy.",
                    "technologies": ["Python", "FastAPI"],
                },
                {
                    "name": "AncyMon",
                    "role": "Twórca",
                    "description": "System monitorowania maszyn.",
                    "technologies": ["Go", "Docker"],
                },
                {
                    "name": "KandidFlow",
                    "role": "Współtwórca",
                    "description": "Platforma automatyzacji rekrutacji IT.",
                    "technologies": ["Python", "React", "Typst"],
                },
            ],
        },
        {"id": "education", "type": "education", "title": "Edukacja", "items": []},
        {
            "id": "experience",
            "type": "experience",
            "title": "Doświadczenie zawodowe",
            "items": [],
        },
        {"id": "certificates", "type": "certificates", "title": "Certyfikaty", "items": []},
    ]

    contact_info = {"email": None, "phone": None}
    raw_text = "Jan Kowalski, email: jan@example.com, tel: +48 500 123 456"

    sanitized, updated_contact = _enforce_cross_section_guardrails(
        misclassified_sections, contact_info, raw_text
    )

    # 1. Contact info backfilled from regex
    assert updated_contact["email"] == "jan@example.com"
    assert updated_contact["phone"] == "+48 500 123 456"

    sec_map = {s["id"]: s for s in sanitized}

    # 2. Education received 3 items
    edu_sec = sec_map["education"]
    assert len(edu_sec["items"]) == 3
    edu_institutions = [it["institution"] for it in edu_sec["items"]]
    assert "Zespół Szkół Elektronicznych w Lublinie" in edu_institutions
    assert edu_institutions.count("Politechnika Lubelska") == 2
    degrees = [it["degree"] for it in edu_sec["items"]]
    assert any("Technik" in d for d in degrees)
    assert any("Inżynier" in d for d in degrees)
    assert any("Magister" in d for d in degrees)

    # 3. Experience received Mk Systems
    exp_sec = sec_map["experience"]
    assert len(exp_sec["items"]) == 1
    assert exp_sec["items"][0]["company"] == "Mk Systems"
    assert exp_sec["items"][0]["position"] == "Praktykant"

    # 4. Certificates received 3 items
    cert_sec = sec_map["certificates"]
    assert len(cert_sec["items"]) == 3
    cert_names = [it["name"] for it in cert_sec["items"]]
    assert any("CCNA" in name for name in cert_names)
    assert any("OKE" in name or "E.12" in name for name in cert_names)
    assert any("Google Cloud" in name for name in cert_names)

    # 5. Projects contains ONLY real projects
    proj_sec = sec_map["projects"]
    proj_names = [it["name"] for it in proj_sec["items"]]
    assert len(proj_names) == 6
    assert "Homelab K3s" in proj_names
    assert "LAN & Firewall Configuration" in proj_names
    assert "Plan zajęć" in proj_names
    assert "GameVibes" in proj_names
    assert "AncyMon" in proj_names
    assert "KandidFlow" in proj_names
    # Verify no schools or certificates remain in projects
    assert not any("Politechnika" in name for name in proj_names)
    assert not any("Zespół Szkół" in name for name in proj_names)
    assert not any("CCNA" in name for name in proj_names)
    assert not any("Mk Systems" in name for name in proj_names)


@pytest.mark.asyncio
async def test_end_to_end_parse_and_apply_user_scenario(
    async_client: httpx.AsyncClient,
) -> None:
    """Test end-to-end hybrid parsing with the user's structured knowledge base document."""

    # Mock isolated section calls from llm_client
    async def mock_generate_json(system_prompt: str, user_prompt: str, **kwargs: Any) -> Any:
        sys_lower = system_prompt.lower()
        if "educational" in sys_lower:
            return {
                "items": [
                    {
                        "institution": "Zespół Szkół Elektronicznych w Lublinie",
                        "degree": "Technik Informatyk",
                        "field_of_study": "Informatyka",
                        "start_date": "2016",
                        "end_date": "2020",
                    },
                    {
                        "institution": "Politechnika Lubelska",
                        "degree": "Inżynier",
                        "field_of_study": "Informatyka",
                        "start_date": "2020",
                        "end_date": "2024",
                    },
                    {
                        "institution": "Politechnika Lubelska",
                        "degree": "Magister Inżynier",
                        "field_of_study": "Informatyka",
                        "start_date": "2024",
                        "end_date": "present",
                    },
                ]
            }
        elif "work experience" in sys_lower:
            return {
                "items": [
                    {
                        "position": "Praktykant",
                        "company": "Mk Systems",
                        "location": "Lublin",
                        "start_date": "2021-07",
                        "end_date": "2021-09",
                        "highlights": [
                            "Konfiguracja sieci firmowych",
                            "Konfiguracja serwerów Linux",
                        ],
                    }
                ]
            }
        elif "technical project" in sys_lower:
            return {
                "items": [
                    {
                        "name": "Homelab K3s",
                        "role": "Twórca",
                        "url": "",
                        "start_date": "2023",
                        "end_date": "present",
                        "description": "Domowe środowisko laboratoryjne oparte o k3s i Proxmox.",
                        "technologies": ["k3s", "Proxmox", "Linux"],
                    },
                    {
                        "name": "LAN & Firewall Configuration",
                        "role": "Twórca",
                        "url": "",
                        "start_date": "2023",
                        "end_date": "2023",
                        "description": "Wdrożenie OPNsense i segmentacja sieci VLAN.",
                        "technologies": ["OPNsense", "VLAN", "Networking"],
                    },
                    {
                        "name": "Plan zajęć",
                        "role": "Twórca",
                        "url": "",
                        "start_date": "2023",
                        "end_date": "present",
                        "description": (
                            "Aplikacja mobilna do planowania zajęć dla studentów Politechniki."
                        ),
                        "technologies": ["Flutter", "Dart", "Firebase"],
                    },
                    {
                        "name": "GameVibes",
                        "role": "Twórca",
                        "url": "",
                        "start_date": "2024",
                        "end_date": "present",
                        "description": "Platforma społecznościowa dla graczy.",
                        "technologies": ["FastAPI", "PostgreSQL", "React"],
                    },
                    {
                        "name": "K8s Cluster Monitoring",
                        "role": "Twórca",
                        "url": "",
                        "start_date": "2024",
                        "end_date": "2024",
                        "description": "Prometheus, Grafana i Alertmanager w Bare-metal.",
                        "technologies": ["Kubernetes", "Prometheus", "Grafana"],
                    },
                    {
                        "name": "AncyMon",
                        "role": "Twórca",
                        "url": "",
                        "start_date": "2024",
                        "end_date": "present",
                        "description": "System monitorowania maszyn wirtualnych.",
                        "technologies": ["Go", "Docker"],
                    },
                    {
                        "name": "KandidFlow",
                        "role": "Współtwórca",
                        "url": "github.com/Adamad7/kandid-flow",
                        "start_date": "2024",
                        "end_date": "present",
                        "description": "Platforma automatyzacji rekrutacji IT.",
                        "technologies": ["Python", "FastAPI", "React", "Typst"],
                    },
                ]
            }
        elif "certificate" in sys_lower:
            return {
                "items": [
                    {
                        "name": "CCNA: Introduction to Networks",
                        "issuer": "Cisco Networking Academy",
                        "issue_date": "2022",
                    },
                    {
                        "name": "E.12, E.13, E.14",
                        "issuer": "OKE Kraków",
                        "issue_date": "2020",
                    },
                    {
                        "name": "Google Cloud Certified Associate Cloud Engineer",
                        "issuer": "Google Cloud",
                        "issue_date": "2023",
                    },
                ]
            }
        elif "skill" in sys_lower:
            return {
                "items": [
                    {
                        "category": "Platform & Cloud",
                        "skills": ["Docker", "Kubernetes", "Linux", "AWS", "Proxmox"],
                    },
                    {
                        "category": "Backend & DevOps",
                        "skills": ["Python", "FastAPI", "CI/CD", "Git", "PostgreSQL"],
                    },
                ]
            }
        elif "language" in sys_lower:
            return {
                "items": [
                    {"name": "Polski", "level": "Ojczysty (Native)"},
                    {"name": "Angielski", "level": "B2/C1"},
                ]
            }
        return {"items": []}

    target_mock = "app.services.candidate_parser.llm_client.generate_json"
    with patch(target_mock, new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = mock_generate_json

        response = await async_client.post(
            "/api/v1/candidate/ai-fill",
            json={
                "text": SAMPLE_USER_KB_MARKDOWN,
                "mode": "replace",
            },
        )
        assert response.status_code == 200
        candidate = response.json()

        # 1. Full name & contact info
        assert candidate["full_name"] == "Jan Kowalski"
        assert candidate["contact_info"]["email"] == "jan.kowalski@example.com"
        assert candidate["contact_info"]["phone"] == "+48 500 123 456"
        assert candidate["contact_info"]["github"] == "github.com/jankowalski"
        assert candidate["contact_info"]["linkedin"] == "linkedin.com/in/jankowalski"
        assert candidate["contact_info"]["location"] == "Lublin, Polska"

        sec_map = {s["id"]: s for s in candidate["sections"]}

        # 2. Summary fast-path verification
        assert "Doświadczony inżynier" in sec_map["summary"]["content"]

        # 3. Clause fast-path verification
        assert "Wyrażam zgodę" in sec_map["clause"]["content"]

        # 4. Education has exactly 3 items
        edu_items = sec_map["education"]["items"]
        assert len(edu_items) == 3
        edu_institutions = [it["institution"] for it in edu_items]
        assert "Zespół Szkół Elektronicznych w Lublinie" in edu_institutions
        assert edu_institutions.count("Politechnika Lubelska") == 2

        # 5. Experience has Mk Systems
        exp_items = sec_map["experience"]["items"]
        assert len(exp_items) == 1
        assert exp_items[0]["company"] == "Mk Systems"
        assert exp_items[0]["position"] == "Praktykant"

        # 6. Certificates has 3 items
        cert_items = sec_map["certificates"]["items"]
        assert len(cert_items) == 3
        cert_issuers = [it["issuer"] for it in cert_items]
        assert "Cisco Networking Academy" in cert_issuers
        assert "OKE Kraków" in cert_issuers
        assert "Google Cloud" in cert_issuers

        # 7. Projects has 7 items, zero schools or certs
        proj_items = sec_map["projects"]["items"]
        assert len(proj_items) == 7
        proj_names = [it["name"] for it in proj_items]
        assert "Homelab K3s" in proj_names
        assert "LAN & Firewall Configuration" in proj_names
        assert "Plan zajęć" in proj_names
        assert "GameVibes" in proj_names
        assert "K8s Cluster Monitoring" in proj_names
        assert "AncyMon" in proj_names
        assert "KandidFlow" in proj_names

        # 8. Skills has categories
        skill_cats = sec_map["skills"]["items"]
        assert len(skill_cats) == 2
        cat_names = [c["category"] for c in skill_cats]
        assert "Platform & Cloud" in cat_names
        assert "Backend & DevOps" in cat_names

        # 9. Languages
        lang_items = sec_map["languages"]["items"]
        assert len(lang_items) == 2
        lang_names = [lang["name"] for lang in lang_items]
        assert "Polski" in lang_names
        assert "Angielski" in lang_names

        # 10. Guarantee all 11 sections
        assert len(candidate["sections"]) == 11

        # Clean up database to baseline Jan Kowalski
        await async_client.post("/api/v1/candidate/reset-default")


@pytest.mark.asyncio
async def test_direct_service_parse_and_apply_user_scenario() -> None:
    """Test CandidateParser.parse_and_apply directly on AsyncSession."""
    sparse_seg_output = {
        "items": [
            {
                "institution": "Politechnika Lubelska",
                "degree": "Inżynier",
                "field_of_study": "Informatyka",
                "start_date": "2020",
                "end_date": "2024",
            }
        ]
    }

    target_mock = "app.services.candidate_parser.llm_client.generate_json"
    with patch(target_mock, new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = sparse_seg_output

        async with db_session_factory() as session:
            req = CandidateAIFillRequest(
                text=SAMPLE_USER_KB_MARKDOWN,
                mode="replace",
            )
            candidate = await CandidateParser.parse_and_apply(req, session)
            assert candidate.full_name == "Jan Kowalski"
            assert candidate.contact_info["email"] == "jan.kowalski@example.com"
            assert len(candidate.sections) == 11
