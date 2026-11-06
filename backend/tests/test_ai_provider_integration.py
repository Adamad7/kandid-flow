"""Integration tests validating configurable AI model execution (local Ollama vs cloud API)."""

import uuid

import httpx
import pytest

from app.models.job import JobOffer
from app.services.job_parser import reparse_job_by_id
from app.services.llm_client import llm_client
from tests.conftest import get_ai_test_provider, test_session_factory


@pytest.mark.asyncio
async def test_ai_provider_env_variable_is_recognized() -> None:
    """Verify that TEST_AI_PROVIDER environment variable is recognized and valid."""
    active_provider = get_ai_test_provider()
    assert active_provider in ("local", "cloud", "mock"), (
        f"Invalid TEST_AI_PROVIDER '{active_provider}'. Expected 'local', 'cloud', or 'mock'."
    )


@pytest.mark.asyncio
async def test_llm_client_generates_json_with_active_provider() -> None:
    """Verify that llm_client.generate_json executes against the configured model."""
    active_provider = get_ai_test_provider()
    if active_provider == "mock":
        pytest.skip("Running in mock mode; skipping live model invocation")

    system_prompt = (
        "You are an AI data extractor. Respond in JSON matching: "
        '{"status": "ok", "extracted_name": "<name>", "provider_tested": "<provider>"}.'
    )
    user_prompt = f"Extract name 'Antigravity' and provider '{active_provider}'."

    result = await llm_client.generate_json(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )

    assert isinstance(result, dict), f"Expected dict from AI model, got {type(result)}: {result}"
    assert result.get("status") == "ok" or "extracted_name" in result or "name" in result


@pytest.mark.asyncio
async def test_candidate_ai_fill_end_to_end_with_active_provider(
    async_client: httpx.AsyncClient,
) -> None:
    """Verify POST /api/v1/candidate/ai-fill parses profile with active model."""
    active_provider = get_ai_test_provider()
    if active_provider == "mock":
        pytest.skip("Running in mock mode; skipping live model invocation")

    sample_cv = (
        "Tomasz Krawczyk\n"
        "Email: tomasz.krawczyk@example.com\n"
        "Telefon: +48 501 234 567\n"
        "Lokalizacja: Wrocław, Polska\n\n"
        "Podsumowanie:\n"
        "Architekt systemów chmurowych i Full Stack Python Developer.\n\n"
        "Umiejętności:\n"
        "- Backend: Python, FastAPI, Docker, Kubernetes\n\n"
        "Doświadczenie zawodowe:\n"
        "Lead Developer w TechSolutions Wrocław (2022-03 - obecnie)\n"
        "- Projektowanie skalowalnych backendów w chmurze.\n\n"
        "Klauzula RODO:\n"
        "Wyrażam zgodę na przetwarzanie moich danych osobowych."
    )

    resp = await async_client.post(
        "/api/v1/candidate/ai-fill",
        json={
            "text": sample_cv,
            "mode": "replace",
            "enable_thinking": False,
        },
    )

    assert resp.status_code == 200, f"ai-fill failed: {resp.text}"
    data = resp.json()
    assert "Tomasz" in data.get("full_name", "") or "Krawczyk" in data.get("full_name", "")
    assert data.get("contact_info", {}).get("email") == "tomasz.krawczyk@example.com"

    # Reset candidate profile to default
    await async_client.post("/api/v1/candidate/reset-default")


@pytest.mark.asyncio
async def test_job_offer_ai_reparse_with_active_provider() -> None:
    """Verify that job_parser reparse extracts structured data using active model."""
    active_provider = get_ai_test_provider()
    if active_provider == "mock":
        pytest.skip("Running in mock mode; skipping live model invocation")

    url = f"https://justjoin.it/offers/pytest-ai-integration-{uuid.uuid4()}"
    test_job = JobOffer(
        source_url=url,
        source_portal="justjoin",
        company_name="Cloud AI Sp. z o.o.",
        role_title="Senior Python Backend Specialist",
        status="inbox",
        work_model="remote",
        raw_payload={
            "source_url": url,
            "source_portal": "justjoin",
            "title": "Senior Python Backend Specialist",
            "company": "Cloud AI Sp. z o.o.",
            "description_text": (
                "Poszukujemy programisty Python z doświadczeniem w FastAPI, Docker i PostgreSQL. "
                "Oferujemy pracę w 100% zdalną (Remote). Wymagania: minimum 4 lata doświadczenia."
            ),
            "requirements_raw": ["Python", "FastAPI", "Docker", "PostgreSQL"],
        },
    )

    async with test_session_factory() as session:
        session.add(test_job)
        await session.commit()
        await session.refresh(test_job)
        job_id = test_job.id

    try:
        async with test_session_factory() as session:
            reparsed_job = await reparse_job_by_id(job_id, session, mode="ai")

        assert reparsed_job.status in ("ready", "inbox")
        if reparsed_job.structured_data:
            tech_stack = reparsed_job.structured_data.get("tech_stack", [])
            assert any(t.lower() == "python" for t in tech_stack)
            assert reparsed_job.work_model in ("remote", "hybrid", "onsite")
    finally:
        async with test_session_factory() as session:
            job_to_del = await session.get(JobOffer, job_id)
            if job_to_del:
                await session.delete(job_to_del)
                await session.commit()


@pytest.mark.asyncio
async def test_follow_up_generation_with_active_provider() -> None:
    """Verify follow-up generation using the active AI provider."""
    active_provider = get_ai_test_provider()
    if active_provider == "mock":
        pytest.skip("Running in mock mode; skipping live model invocation")

    result = await llm_client.generate_follow_up(
        role_title="Senior Python Engineer",
        company_name="Innovatech Poland",
        applied_at_str="2026-10-25",
        tone="polite_inquiry",
    )

    assert isinstance(result, dict)
    assert "subject" in result
    assert "content" in result
    assert len(result["content"]) > 20
