from datetime import UTC, datetime
from typing import Any

import httpx
import pytest

from app.models.job import JobOffer
from app.services.job_parser import canonicalize_url


def test_url_canonicalization():
    """Verify that URL canonicalization removes tracking query parameters and fragments."""
    dirty_url = (
        "https://justjoin.it/offers/python-developer?"
        "utm_source=linkedin&utm_medium=social&utm_campaign=job_share&searchId=12345#overview"
    )
    expected = "https://justjoin.it/offers/python-developer"
    assert canonicalize_url(dirty_url) == expected

    nested_params = "https://pracuj.pl/praca/devops-engineer,oferta?trk=public_jobs&page=2"
    assert (
        canonicalize_url(nested_params) == "https://pracuj.pl/praca/devops-engineer,oferta?page=2"
    )


@pytest.mark.asyncio
async def test_events_crud_lifecycle(async_client: httpx.AsyncClient, sample_job_offer: JobOffer):
    """Verify full CRUD lifecycle for recruitment events."""
    job_id = str(sample_job_offer.id)

    # 1. Create event
    event_payload = {
        "job_offer_id": job_id,
        "event_type": "technical_interview",
        "title": "Rozmowa techniczna - live coding",
        "scheduled_at": datetime.now(UTC).isoformat(),
        "duration_minutes": 90,
        "location_or_link": "https://meet.google.com/abc-defg-hij",
        "interviewers": "Tomasz (Lead Dev), Anna (HR)",
        "notes": "Pytania o architekturę rozproszoną i Kubernetes.",
        "is_completed": False,
    }
    create_res = await async_client.post("/api/v1/events", json=event_payload)
    assert create_res.status_code == 201
    created_event = create_res.json()
    event_id = created_event["id"]
    assert created_event["title"] == "Rozmowa techniczna - live coding"
    assert created_event["duration_minutes"] == 90

    # 2. List events for this job
    list_res = await async_client.get(f"/api/v1/events?job_offer_id={job_id}")
    assert list_res.status_code == 200
    events_list = list_res.json()
    assert any(e["id"] == event_id for e in events_list)

    # 3. Update event (mark completed)
    update_res = await async_client.patch(
        f"/api/v1/events/{event_id}",
        json={"is_completed": True, "notes": "Zadanie zrobione perfekcyjnie."},
    )
    assert update_res.status_code == 200
    updated_event = update_res.json()
    assert updated_event["is_completed"] is True
    assert updated_event["notes"] == "Zadanie zrobione perfekcyjnie."

    # 4. Delete event
    delete_res = await async_client.delete(f"/api/v1/events/{event_id}")
    assert delete_res.status_code == 204

    # 5. Verify 404 after deletion
    get_deleted = await async_client.get(f"/api/v1/events/{event_id}")
    assert get_deleted.status_code == 404


@pytest.mark.asyncio
async def test_settings_read_and_update(async_client: httpx.AsyncClient):
    """Verify runtime settings retrieval and modification (non-secret only)."""
    # 1. Read settings
    get_res = await async_client.get("/api/v1/settings")
    assert get_res.status_code == 200
    app_settings = get_res.json()
    assert "auto_parse_mode" in app_settings
    assert "ollama_model" in app_settings
    # Verify secret token is NOT leaked in database settings
    assert "extension_api_token" not in app_settings

    # 2. Update settings and restore in finally block
    orig_ollama_model = app_settings.get("ollama_model", "gemma4:12b")
    orig_api_provider = app_settings.get("api_provider", "gemini")
    try:
        update_res = await async_client.put(
            "/api/v1/settings",
            json={"ollama_model": "qwen2.5:32b", "api_provider": "gemini"},
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["ollama_model"] == "qwen2.5:32b"
        assert "updated_at" in updated
    finally:
        await async_client.put(
            "/api/v1/settings",
            json={"ollama_model": orig_ollama_model, "api_provider": orig_api_provider},
        )


@pytest.mark.asyncio
async def test_reparse_job_endpoint(async_client: httpx.AsyncClient, sample_job_offer: JobOffer):
    """Verify manual reparse trigger on job offer."""
    job_id = str(sample_job_offer.id)

    reparse_res = await async_client.post(f"/api/v1/jobs/{job_id}/reparse")
    assert reparse_res.status_code == 200
    reparsed_job = reparse_res.json()
    assert reparsed_job["status"] == "ready"
    assert reparsed_job["structured_data"] is not None


@pytest.mark.asyncio
async def test_cv_refine_block_endpoint(
    async_client: httpx.AsyncClient, sample_job_offer: JobOffer
):
    """Verify inline AI refinement of a single CV section block."""
    # 1. Fetch available preset
    presets_res = await async_client.get("/api/v1/presets")
    preset = presets_res.json()[0]
    job_id = str(sample_job_offer.id)

    # 2. Generate a CV version
    gen_res = await async_client.post(
        "/api/v1/cv/generate",
        json={
            "job_offer_id": job_id,
            "preset_id": preset["id"],
            "tailoring_mode": "targeted_summary_keywords",
            "language": "pl",
        },
    )
    assert gen_res.status_code == 201
    cv_version = gen_res.json()
    cv_version_id = cv_version["id"]

    # 3. Refine summary block
    refine_res = await async_client.post(
        f"/api/v1/cv/{cv_version_id}/refine-block",
        json={
            "block_id": "summary",
            "instruction": "Skróć do jednego zdania i podkreśl Kubernetes",
        },
    )
    assert refine_res.status_code == 200
    refine_body = refine_res.json()
    assert refine_body["block_id"] == "summary"
    assert "refined_block" in refine_body
    assert "content" in refine_body["refined_block"]


@pytest.mark.asyncio
async def test_cv_generate_with_provider_and_model(
    async_client: httpx.AsyncClient, sample_job_offer: JobOffer
):
    """Verify that CV generation accepts explicit llm_provider and llm_model parameters."""
    presets_res = await async_client.get("/api/v1/presets")
    preset = presets_res.json()[0]
    job_id = str(sample_job_offer.id)

    gen_res = await async_client.post(
        "/api/v1/cv/generate",
        json={
            "job_offer_id": job_id,
            "preset_id": preset["id"],
            "tailoring_mode": "targeted_summary_keywords",
            "language": "pl",
            "llm_provider": "ollama",
            "llm_model": "deepseek-r1:14b",
        },
    )
    assert gen_res.status_code == 201
    cv_version = gen_res.json()
    assert cv_version["id"] is not None
    assert cv_version["version_number"] == 1


@pytest.mark.asyncio
async def test_cv_refine_block_with_provider_and_grounding(
    async_client: httpx.AsyncClient,
    sample_job_offer: JobOffer,
    monkeypatch: pytest.MonkeyPatch,
):
    """Verify refine-block passes LLM provider, reasoning flag, and grounds with context."""
    from app.services.llm_client import llm_client

    captured_kwargs: dict[str, Any] = {}

    async def mock_generate_json(**kwargs: Any) -> Any:
        captured_kwargs.update(kwargs)
        return {
            "id": "summary",
            "type": "summary",
            "title": "Podsumowanie zawodowe",
            "content": "Senior Python Engineer, expert in FastAPI and Kubernetes.",
        }

    monkeypatch.setattr(llm_client, "generate_json", mock_generate_json)

    # 1. Fetch available preset
    presets_res = await async_client.get("/api/v1/presets")
    preset = presets_res.json()[0]
    job_id = str(sample_job_offer.id)

    # 2. Generate a CV version
    gen_res = await async_client.post(
        "/api/v1/cv/generate",
        json={
            "job_offer_id": job_id,
            "preset_id": preset["id"],
            "tailoring_mode": "targeted_summary_keywords",
            "language": "pl",
        },
    )
    assert gen_res.status_code == 201
    cv_version = gen_res.json()
    cv_version_id = cv_version["id"]

    # 3. Refine summary block with explicit llm_provider, llm_model, enable_thinking
    refine_res = await async_client.post(
        f"/api/v1/cv/{cv_version_id}/refine-block",
        json={
            "block_id": "summary",
            "instruction": "Podkreśl doświadczenie w chmurze i architekturze mikrousług",
            "llm_provider": "gemini",
            "llm_model": "gemini-2.5-flash",
            "enable_thinking": False,
        },
    )
    assert refine_res.status_code == 200
    refine_body = refine_res.json()
    assert refine_body["block_id"] == "summary"
    assert "FastAPI and Kubernetes" in refine_body["refined_block"]["content"]

    # 4. Assert LLM invocation received provider, model, enable_thinking, and grounding sections
    assert captured_kwargs.get("provider") == "gemini"
    assert captured_kwargs.get("model") == "gemini-2.5-flash"
    assert captured_kwargs.get("enable_thinking") is False

    system_prompt = captured_kwargs.get("system_prompt", "")
    assert "ATS Resume Editor" in system_prompt
    assert "Candidate Knowledge Base" in system_prompt

    user_prompt = captured_kwargs.get("user_prompt", "")
    assert "=== TARGET JOB OFFER ===" in user_prompt
    assert "=== CANDIDATE KNOWLEDGE BASE (GROUND TRUTH) ===" in user_prompt
    assert "=== CURRENT CV SECTION BLOCK TO REFINE ===" in user_prompt
    assert "=== CANDIDATE INSTRUCTION ===" in user_prompt
    assert "Podkreśl doświadczenie w chmurze" in user_prompt
