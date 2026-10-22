"""Integration tests for Base CV Presets and tailoring integration."""

import httpx
import pytest

from app.models.job import JobOffer


@pytest.mark.asyncio
async def test_presets_crud_lifecycle(async_client: httpx.AsyncClient):
    """Verify full CRUD lifecycle for Base CV Presets."""
    # 1. List initial presets
    list_res = await async_client.get("/api/v1/presets")
    assert list_res.status_code == 200
    initial_presets = list_res.json()
    assert len(initial_presets) >= 2

    # 2. Create new preset
    new_preset_payload = {
        "title": "Data Engineer Archetype",
        "language": "pl",
        "layout_schema": [
            {
                "id": "summary",
                "type": "summary",
                "content": "Data engineer specializing in Spark and Airflow.",
            },
            {
                "id": "skills",
                "type": "skills",
                "items": [{"category": "Big Data", "skills": ["Spark", "Airflow", "Kafka"]}],
            },
        ],
    }
    create_res = await async_client.post("/api/v1/presets", json=new_preset_payload)
    assert create_res.status_code == 201
    created_preset = create_res.json()
    preset_id = created_preset["id"]
    assert created_preset["title"] == "Data Engineer Archetype"

    # 3. Get single preset
    get_res = await async_client.get(f"/api/v1/presets/{preset_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == preset_id

    # 4. Update preset
    update_res = await async_client.put(
        f"/api/v1/presets/{preset_id}",
        json={"title": "Senior Data Engineer Archetype"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Senior Data Engineer Archetype"

    # 5. Delete preset
    delete_res = await async_client.delete(f"/api/v1/presets/{preset_id}")
    assert delete_res.status_code == 204

    # 6. Verify 404 after deletion
    get_deleted = await async_client.get(f"/api/v1/presets/{preset_id}")
    assert get_deleted.status_code == 404


@pytest.mark.asyncio
async def test_tailored_cv_generation_from_preset(
    async_client: httpx.AsyncClient, sample_job_offer: JobOffer
):
    """Verify CV tailoring using an existing preset and targeted_summary_keywords mode."""
    # 1. Fetch available preset
    presets_res = await async_client.get("/api/v1/presets")
    assert presets_res.status_code == 200
    presets = presets_res.json()
    assert len(presets) > 0
    preset = presets[0]

    # 2. Generate tailored CV using isolated sample job offer
    job_id = str(sample_job_offer.id)
    generate_payload = {
        "job_offer_id": job_id,
        "preset_id": preset["id"],
        "tailoring_mode": "targeted_summary_keywords",
        "language": "pl",
    }
    gen_res = await async_client.post("/api/v1/cv/generate", json=generate_payload)
    assert gen_res.status_code == 201
    cv_version = gen_res.json()
    assert cv_version["job_offer_id"] == job_id
    assert cv_version["parent_preset_id"] == preset["id"]
    assert cv_version["is_active"] is True
    assert cv_version["version_number"] == 1

    # Verify customized clause and summary
    schema = cv_version["layout_schema"]
    sections = schema.get("sections", [])
    section_types = [s.get("type") or s.get("id") for s in sections]
    assert "summary" in section_types
    assert "clause" in section_types

    # 3. Check versions list endpoint
    versions_res = await async_client.get(f"/api/v1/cv/versions/{job_id}")
    assert versions_res.status_code == 200
    versions = versions_res.json()
    assert len(versions) == 1
    assert any(v["id"] == cv_version["id"] for v in versions)


@pytest.mark.asyncio
async def test_cv_generation_with_section_modes_and_candidate_profile(
    async_client: httpx.AsyncClient,
    sample_job_offer: JobOffer,
):
    """Verify CV generation respecting section modes ('off', 'raw', 'ai') and profile defaults."""
    # 1. Update candidate profile with new default_sections structure
    cand_res = await async_client.get("/api/v1/candidate")
    assert cand_res.status_code == 200

    new_defaults = [
        {"id": "summary", "mode": "ai"},
        {"id": "skills", "mode": "ai"},
        {"id": "experience", "mode": "raw"},
        {"id": "projects", "mode": "off"},
        {"id": "education", "mode": "raw"},
    ]
    update_res = await async_client.put(
        "/api/v1/candidate",
        json={"default_sections": new_defaults},
    )
    assert update_res.status_code == 200
    updated_profile = update_res.json()
    assert len(updated_profile["default_sections"]) == 5
    assert updated_profile["default_sections"][0]["mode"] == "ai"

    # 2. Generate CV with explicit section modes (projects off, experience raw)
    job_id = str(sample_job_offer.id)
    gen_payload = {
        "job_offer_id": job_id,
        "preset_id": None,
        "language": "pl",
        "llm_provider": "api",
        "api_key": "dummy_test_key_sk_for_unit_tests",
        "sections": [
            {"id": "summary", "mode": "ai"},
            {"id": "experience", "mode": "raw"},
            {"id": "projects", "mode": "off"},
            {"id": "clause", "mode": "ai"},
        ],
    }
    gen_res = await async_client.post("/api/v1/cv/generate", json=gen_payload)
    assert gen_res.status_code == 201
    cv = gen_res.json()

    sec_ids = [s.get("id") or s.get("type") for s in cv["layout_schema"]["sections"]]
    assert "summary" in sec_ids
    assert "experience" in sec_ids
    assert "clause" in sec_ids
    assert "projects" not in sec_ids  # Because mode was 'off'
