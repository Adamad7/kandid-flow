"""Tests for Candidate Profile Knowledge Base AI Fill and Default Reset endpoints."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest


@pytest.mark.asyncio
async def test_reset_candidate_profile_to_default(async_client: httpx.AsyncClient) -> None:
    """Test POST /api/v1/candidate/reset-default resets profile to Jan Kowalski benchmark."""
    # First alter the profile with custom data
    put_resp = await async_client.put(
        "/api/v1/candidate",
        json={
            "full_name": "Temporary Custom User",
            "contact_info": {
                "email": "temp@example.com",
            },
            "sections": [
                {
                    "id": "summary",
                    "type": "summary",
                    "title": "O mnie",
                    "content": "Temporary summary text",
                }
            ],
        },
    )
    assert put_resp.status_code == 200
    assert put_resp.json()["full_name"] == "Temporary Custom User"

    # Now reset to default
    reset_resp = await async_client.post("/api/v1/candidate/reset-default")
    assert reset_resp.status_code == 200
    data = reset_resp.json()
    assert data["full_name"] == "Jan Kowalski"
    assert data["contact_info"]["email"] == "jan.kowalski@example.com"
    assert data["contact_info"]["phone"] == "+48 500 123 456"
    assert data["contact_info"]["location"] == "Warszawa, Polska"

    # Verify sections exist
    section_ids = [s["id"] for s in data["sections"]]
    assert "summary" in section_ids
    assert "skills" in section_ids
    assert "experience" in section_ids
    assert "projects" in section_ids
    assert "education" in section_ids
    assert "certificates" in section_ids
    assert "clause" in section_ids


@pytest.mark.asyncio
async def test_candidate_ai_fill_replace_mode(async_client: httpx.AsyncClient) -> None:
    """Test POST /api/v1/candidate/ai-fill with mode='replace' replaces candidate data."""
    mock_llm_output = {
        "full_name": "Anna Nowak",
        "contact_info": {
            "email": "anna.nowak@example.com",
            "phone": "+48 600 111 222",
            "location": "Kraków, Polska",
            "github": "github.com/annanowak",
            "linkedin": "linkedin.com/in/annanowak",
            "portfolio": "https://annanowak.dev",
        },
        "sections": [
            {
                "id": "summary",
                "type": "summary",
                "title": "O mnie",
                "content": "Senior Python Backend Engineer z 7-letnim stażem.",
            },
            {
                "id": "skills",
                "type": "skills",
                "title": "Umiejętności",
                "items": [
                    {
                        "category": "Backend",
                        "skills": ["Python", "FastAPI", "PostgreSQL"],
                    }
                ],
            },
            {
                "id": "experience",
                "type": "experience",
                "title": "Doświadczenie zawodowe",
                "items": [
                    {
                        "position": "Senior Backend Developer",
                        "company": "Kraków Tech Innovations",
                        "location": "Kraków",
                        "start_date": "2021-01",
                        "end_date": "present",
                        "highlights": ["Zaprojektowanie architektury mikroserwisów."],
                    }
                ],
            },
            {
                "id": "projects",
                "type": "projects",
                "title": "Projekty",
                "items": [
                    {
                        "name": "DistributedTaskQueue",
                        "role": "Creator",
                        "url": "github.com/annanowak/task-queue",
                        "start_date": "2023",
                        "end_date": "present",
                        "description": "Async distributed task queue in Python.",
                        "technologies": ["Python", "Redis", "Asyncio"],
                    }
                ],
            },
            {
                "id": "education",
                "type": "education",
                "title": "Edukacja",
                "items": [
                    {
                        "institution": "AGH w Krakowie",
                        "degree": "Magister Inżynier",
                        "field_of_study": "Informatyka Stosowana",
                        "start_date": "2015-10",
                        "end_date": "2020-06",
                    }
                ],
            },
            {
                "id": "certificates",
                "type": "certificates",
                "title": "Certyfikaty",
                "items": [
                    {
                        "name": "AWS Certified Solutions Architect",
                        "issuer": "Amazon Web Services",
                        "issue_date": "2023-05",
                    }
                ],
            },
            {
                "id": "clause",
                "type": "clause",
                "title": "Klauzula RODO",
                "content": "Wyrażam zgodę na przetwarzanie danych osobowych.",
            },
        ],
    }

    target_mock = "app.services.candidate_parser.llm_client.generate_json"
    with patch(target_mock, new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_llm_output

        response = await async_client.post(
            "/api/v1/candidate/ai-fill",
            json={
                "text": "CV: Anna Nowak, email: anna.nowak@example.com, Kraków. Python i FastAPI.",
                "llm_provider": "default",
                "mode": "replace",
                "enable_thinking": False,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Anna Nowak"
        assert data["contact_info"]["email"] == "anna.nowak@example.com"
        assert data["contact_info"]["location"] == "Kraków, Polska"

        # Check sections were replaced
        skills_sec = next(s for s in data["sections"] if s["id"] == "skills")
        assert len(skills_sec["items"]) == 1
        assert skills_sec["items"][0]["category"] == "Backend"
        assert "FastAPI" in skills_sec["items"][0]["skills"]

        exp_sec = next(s for s in data["sections"] if s["id"] == "experience")
        assert len(exp_sec["items"]) == 1
        assert exp_sec["items"][0]["company"] == "Kraków Tech Innovations"


@pytest.mark.asyncio
async def test_candidate_ai_fill_merge_mode(async_client: httpx.AsyncClient) -> None:
    """Test POST /api/v1/candidate/ai-fill with mode='merge' intelligently merges details."""
    # Reset to default Jan Kowalski first
    await async_client.post("/api/v1/candidate/reset-default")

    mock_llm_output = {
        "full_name": "",  # Empty full_name should NOT overwrite Jan Kowalski
        "contact_info": {
            "email": None,
            "phone": None,
            "location": "Warszawa / Zdalnie",  # Updated location
            "github": None,
            "linkedin": None,
            "portfolio": None,
        },
        "sections": [
            {
                "id": "skills",
                "type": "skills",
                "title": "Umiejętności",
                "items": [
                    {
                        "category": "Programowanie & Narzędzia",
                        "skills": ["Rust", "Python"],  # "Python" is duplicate, "Rust" is new
                    },
                    {
                        "category": "Security & IAM",
                        "skills": ["OAuth2", "Vault"],  # Brand new category
                    },
                ],
            },
            {
                "id": "experience",
                "type": "experience",
                "title": "Doświadczenie zawodowe",
                "items": [
                    {
                        "position": "DevOps Consultant",
                        "company": "NextGen Cloud Sp. z o.o.",
                        "location": "Warszawa",
                        "start_date": "2024-01",
                        "end_date": "present",
                        "highlights": ["Konsultacje wdrożeniowe AWS i Kubernetes."],
                    }
                ],
            },
        ],
    }

    target_mock = "app.services.candidate_parser.llm_client.generate_json"
    with patch(target_mock, new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_llm_output

        response = await async_client.post(
            "/api/v1/candidate/ai-fill",
            json={
                "text": "Kurs Rust i Vault oraz nowa rola DevOps Consultant w NextGen Cloud.",
                "llm_provider": "gemini",
                "mode": "merge",
                "enable_thinking": True,
            },
        )

        assert response.status_code == 200
        data = response.json()

        # full_name should remain Jan Kowalski
        assert data["full_name"] == "Jan Kowalski"

        # contact_info: email is preserved, location is updated
        assert data["contact_info"]["email"] == "jan.kowalski@example.com"
        assert data["contact_info"]["location"] == "Warszawa / Zdalnie"

        # Skills merged
        skills_sec = next(s for s in data["sections"] if s["id"] == "skills")
        prog_cat = next(
            c for c in skills_sec["items"] if c["category"] == "Programowanie & Narzędzia"
        )
        assert "Rust" in prog_cat["skills"]
        assert "Python" in prog_cat["skills"]
        # Ensure Rust was added without duplicating Python
        assert prog_cat["skills"].count("Python") == 1

        # Brand new category added
        cat_names = [c["category"] for c in skills_sec["items"]]
        assert "Security & IAM" in cat_names

        # Experience appended
        exp_sec = next(s for s in data["sections"] if s["id"] == "experience")
        companies = [it["company"] for it in exp_sec["items"]]
        assert "CloudScale Solutions Sp. z o.o." in companies
        assert "NextGen Cloud Sp. z o.o." in companies


@pytest.mark.asyncio
async def test_candidate_ai_fill_validation_error(async_client: httpx.AsyncClient) -> None:
    """Test validation errors on invalid request (e.g. text too short)."""
    response = await async_client.post(
        "/api/v1/candidate/ai-fill",
        json={
            "text": "123",  # min_length is 5
            "mode": "merge",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_candidate_ai_fill_guarantees_all_7_sections(
    async_client: httpx.AsyncClient,
) -> None:
    """Test that ai-fill ALWAYS guarantees all 7 sections in both replace and merge mode."""
    target_mock = "app.services.candidate_parser.llm_client.generate_json"
    standard_ids = [
        "summary",
        "skills",
        "experience",
        "projects",
        "education",
        "certificates",
        "clause",
    ]

    # Test Replace Mode with sparse LLM output (only summary and skills provided)
    sparse_output = {
        "full_name": "Piotr Zieliński",
        "contact_info": {"email": "piotr@example.com"},
        "sections": [
            {
                "id": "summary",
                "type": "summary",
                "title": "O mnie",
                "content": "Krótkie podsumowanie zawodowe.",
            },
            {
                "id": "skills",
                "type": "skills",
                "title": "Umiejętności",
                "items": [{"category": "AI", "skills": ["PyTorch", "Transformers"]}],
            },
        ],
    }

    with patch(target_mock, new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = sparse_output

        res_replace = await async_client.post(
            "/api/v1/candidate/ai-fill",
            json={
                "text": "Piotr Zieliński, piotr@example.com, AI Engineer",
                "mode": "replace",
            },
        )
        assert res_replace.status_code == 200
        data_rep = res_replace.json()
        rep_ids = [s["id"] for s in data_rep["sections"]]
        assert rep_ids == standard_ids

        # Ensure empty skeletons were appended for missing sections
        exp_sec = next(s for s in data_rep["sections"] if s["id"] == "experience")
        assert exp_sec["items"] == []
        edu_sec = next(s for s in data_rep["sections"] if s["id"] == "education")
        assert edu_sec["items"] == []
        cert_sec = next(s for s in data_rep["sections"] if s["id"] == "certificates")
        assert cert_sec["items"] == []
        proj_sec = next(s for s in data_rep["sections"] if s["id"] == "projects")
        assert proj_sec["items"] == []

    # Test Merge Mode with another sparse output (only education provided)
    merge_output = {
        "full_name": None,
        "contact_info": {},
        "sections": [
            {
                "id": "education",
                "type": "education",
                "title": "Edukacja",
                "items": [
                    {
                        "institution": "Politechnika Lubelska",
                        "degree": "Magister Inżynier",
                        "field_of_study": "Informatyka",
                        "start_date": "2022",
                        "end_date": "present",
                    }
                ],
            }
        ],
    }

    with patch(target_mock, new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = merge_output

        res_merge = await async_client.post(
            "/api/v1/candidate/ai-fill",
            json={
                "text": "Magisterium na Politechnice Lubelskiej od 2022 roku.",
                "mode": "merge",
            },
        )
        assert res_merge.status_code == 200
        data_mrg = res_merge.json()
        mrg_ids = [s["id"] for s in data_mrg["sections"]]
        assert mrg_ids == standard_ids

        # Education was merged
        edu_sec = next(s for s in data_mrg["sections"] if s["id"] == "education")
        assert len(edu_sec["items"]) >= 1
        assert any(it["institution"] == "Politechnika Lubelska" for it in edu_sec["items"])

        # Prior sections (summary, skills, etc.) were not erased
        sum_sec = next(s for s in data_mrg["sections"] if s["id"] == "summary")
        assert sum_sec["content"] == "Krótkie podsumowanie zawodowe."


@pytest.mark.asyncio
async def test_candidate_ai_fill_narrative_bio_extraction(
    async_client: httpx.AsyncClient,
) -> None:
    """Test AI fill with narrative/free-form student description with Google Play deployment."""
    narrative_llm_output = {
        "full_name": "Kacper Maj",
        "contact_info": {
            "email": "kacper.maj@example.com",
            "phone": "+48 501 999 888",
            "location": "Lublin, Polska",
            "github": "github.com/kacpermaj",
            "linkedin": None,
            "portfolio": None,
        },
        "sections": [
            {
                "id": "summary",
                "type": "summary",
                "title": "O mnie",
                "content": (
                    "Student studiów magisterskich na Politechnice Lubelskiej z pasją do "
                    "tworzenia i wdrażania aplikacji mobilnych oraz nowoczesnych rozwiązań AI."
                ),
            },
            {
                "id": "skills",
                "type": "skills",
                "title": "Umiejętności",
                "items": [
                    {
                        "category": "Mobile & Frontend",
                        "skills": ["Flutter", "Kotlin", "Android SDK"],
                    },
                    {
                        "category": "Backend & Cloud",
                        "skills": ["Python", "FastAPI", "Google Play Console"],
                    },
                ],
            },
            {
                "id": "experience",
                "type": "experience",
                "title": "Doświadczenie zawodowe",
                "items": [],
            },
            {
                "id": "projects",
                "type": "projects",
                "title": "Projekty",
                "items": [
                    {
                        "name": "Aplikacja Mobilna w Google Play",
                        "role": "Twórca & Maintainer",
                        "url": "https://play.google.com/store/apps/details?id=com.example.app",
                        "start_date": "2023",
                        "end_date": "present",
                        "description": (
                            "Samodzielne zaprojektowanie, wdrożenie produkcyjne do Google Play "
                            "oraz stałe utrzymanie i rozwój aplikacji mobilnej."
                        ),
                        "technologies": ["Flutter", "FastAPI", "Google Play"],
                    }
                ],
            },
            {
                "id": "education",
                "type": "education",
                "title": "Edukacja",
                "items": [
                    {
                        "institution": "Politechnika Lubelska",
                        "degree": "Studia magisterskie / Magister",
                        "field_of_study": "Informatyka",
                        "start_date": "2023",
                        "end_date": "present",
                    }
                ],
            },
            {
                "id": "certificates",
                "type": "certificates",
                "title": "Certyfikaty",
                "items": [],
            },
            {
                "id": "clause",
                "type": "clause",
                "title": "Klauzula RODO",
                "content": "Wyrażam zgodę na przetwarzanie danych osobowych.",
            },
        ],
    }

    target_mock = "app.services.candidate_parser.llm_client.generate_json"
    with patch(target_mock, new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = narrative_llm_output

        response = await async_client.post(
            "/api/v1/candidate/ai-fill",
            json={
                "text": (
                    "Cześć, jestem Kacper Maj z Lublina "
                    "(kacper.maj@example.com, +48 501 999 888). "
                    "Jestem studentem studiów magisterskich na Politechnice Lubelskiej. "
                    "Moim kluczowym osiągnięciem jest wdrożenie działającej aplikacji "
                    "do Google Play oraz jej stałe utrzymywanie. "
                    "Znam Flutter, Kotlin, Android SDK, Python, FastAPI."
                ),
                "mode": "replace",
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert data["full_name"] == "Kacper Maj"
        assert data["contact_info"]["email"] == "kacper.maj@example.com"
        assert data["contact_info"]["location"] == "Lublin, Polska"

        # Check all 7 sections
        standard_ids = [
            "summary",
            "skills",
            "experience",
            "projects",
            "education",
            "certificates",
            "clause",
        ]
        assert [s["id"] for s in data["sections"]] == standard_ids

        # Verify education
        edu_sec = next(s for s in data["sections"] if s["id"] == "education")
        assert len(edu_sec["items"]) == 1
        assert edu_sec["items"][0]["institution"] == "Politechnika Lubelska"
        assert "Magister" in edu_sec["items"][0]["degree"]

        # Verify project
        proj_sec = next(s for s in data["sections"] if s["id"] == "projects")
        assert len(proj_sec["items"]) == 1
        assert "Google Play" in proj_sec["items"][0]["name"]
        assert "Flutter" in proj_sec["items"][0]["technologies"]


@pytest.mark.asyncio
async def test_candidate_ai_fill_flexible_top_level_sections(
    async_client: httpx.AsyncClient,
) -> None:
    """Test AI fill when LLM returns sections as top-level dictionary keys rather than a list."""
    llm_dict_output = {
        "full_name": "Marek Nowak",
        "contact_info": {"email": "marek@example.com"},
        "summary": "Opis w kluczu summary na poziomie głównym",
        "education": [
            {
                "school": "Uniwersytet Warszawski",
                "title": "Licencjat",
                "major": "Matematyka",
                "from": "2019",
                "to": "2022",
            }
        ],
        "projects": [
            {
                "title": "Biblioteka Open Source",
                "role": "Autor",
                "link": "https://github.com/marek/lib",
                "stack": ["Python", "C++"],
            }
        ],
    }

    target_mock = "app.services.candidate_parser.llm_client.generate_json"
    with patch(target_mock, new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = llm_dict_output

        response = await async_client.post(
            "/api/v1/candidate/ai-fill",
            json={
                "text": "Marek Nowak, UW Matematyka, autor biblioteki w Python i C++.",
                "mode": "replace",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Marek Nowak"

        standard_ids = [
            "summary",
            "skills",
            "experience",
            "projects",
            "education",
            "certificates",
            "clause",
        ]
        assert [s["id"] for s in data["sections"]] == standard_ids

        # Check education mapped from school/title/major/from/to
        edu_sec = next(s for s in data["sections"] if s["id"] == "education")
        assert len(edu_sec["items"]) == 1
        assert edu_sec["items"][0]["institution"] == "Uniwersytet Warszawski"
        assert edu_sec["items"][0]["degree"] == "Licencjat"
        assert edu_sec["items"][0]["field_of_study"] == "Matematyka"
        assert edu_sec["items"][0]["start_date"] == "2019"
        assert edu_sec["items"][0]["end_date"] == "2022"

        # Check projects mapped from title/link/stack
        proj_sec = next(s for s in data["sections"] if s["id"] == "projects")
        assert len(proj_sec["items"]) == 1
        assert proj_sec["items"][0]["name"] == "Biblioteka Open Source"
        assert proj_sec["items"][0]["url"] == "https://github.com/marek/lib"
        assert "Python" in proj_sec["items"][0]["technologies"]

        # Clean up database to default Jan Kowalski baseline
        await async_client.post("/api/v1/candidate/reset-default")
