"""Comprehensive tests for KandidFlow spec v1.1 features."""

from datetime import UTC, datetime

import httpx
import pytest

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
async def test_events_crud_lifecycle(async_client: httpx.AsyncClient):
    """Verify full CRUD lifecycle for recruitment events."""
    # 1. Fetch available job offer
    jobs_res = await async_client.get("/api/v1/jobs")
    assert jobs_res.status_code == 200
    jobs = jobs_res.json()
    assert len(jobs) > 0
    job_id = jobs[0]["id"]

    # 2. Create event
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

    # 3. List events for this job
    list_res = await async_client.get(f"/api/v1/events?job_offer_id={job_id}")
    assert list_res.status_code == 200
    events_list = list_res.json()
    assert any(e["id"] == event_id for e in events_list)

    # 4. Update event (mark completed)
    update_res = await async_client.patch(
        f"/api/v1/events/{event_id}",
        json={"is_completed": True, "notes": "Zadanie zrobione perfekcyjnie."},
    )
    assert update_res.status_code == 200
    updated_event = update_res.json()
    assert updated_event["is_completed"] is True
    assert updated_event["notes"] == "Zadanie zrobione perfekcyjnie."

    # 5. Delete event
    delete_res = await async_client.delete(f"/api/v1/events/{event_id}")
    assert delete_res.status_code == 204

    # 6. Verify 404 after deletion
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

    # 2. Update settings
    update_res = await async_client.put(
        "/api/v1/settings",
        json={"ollama_model": "qwen2.5:32b", "api_provider": "gemini"},
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["ollama_model"] == "qwen2.5:32b"
    assert "updated_at" in updated


@pytest.mark.asyncio
async def test_reparse_job_endpoint(async_client: httpx.AsyncClient):
    """Verify manual reparse trigger on job offer."""
    jobs_res = await async_client.get("/api/v1/jobs")
    assert jobs_res.status_code == 200
    jobs = jobs_res.json()
    assert len(jobs) > 0
    job_id = jobs[0]["id"]

    reparse_res = await async_client.post(f"/api/v1/jobs/{job_id}/reparse")
    assert reparse_res.status_code == 200
    reparsed_job = reparse_res.json()
    assert reparsed_job["status"] == "ready"
    assert reparsed_job["structured_data"] is not None


@pytest.mark.asyncio
async def test_cv_refine_block_endpoint(async_client: httpx.AsyncClient):
    """Verify inline AI refinement of a single CV section block."""
    # 1. Fetch available preset and job
    presets_res = await async_client.get("/api/v1/presets")
    preset = presets_res.json()[0]
    jobs_res = await async_client.get("/api/v1/jobs")
    job = jobs_res.json()[0]

    # 2. Generate a CV version
    gen_res = await async_client.post(
        "/api/v1/cv/generate",
        json={
            "job_offer_id": job["id"],
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
async def test_cv_generate_with_provider_and_model(async_client: httpx.AsyncClient):
    """Verify that CV generation accepts explicit llm_provider and llm_model parameters."""
    presets_res = await async_client.get("/api/v1/presets")
    preset = presets_res.json()[0]
    jobs_res = await async_client.get("/api/v1/jobs")
    job = jobs_res.json()[0]

    gen_res = await async_client.post(
        "/api/v1/cv/generate",
        json={
            "job_offer_id": job["id"],
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
    assert cv_version["version_number"] >= 1
