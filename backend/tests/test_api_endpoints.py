import uuid

import httpx
import pytest

from app.config import settings


@pytest.mark.asyncio
async def test_health_check(async_client: httpx.AsyncClient):
    """Verify health endpoint."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "kandid-flow-backend"}


@pytest.mark.asyncio
async def test_list_and_filter_jobs(async_client: httpx.AsyncClient):
    """Verify jobs listing and filters."""
    response = await async_client.get("/api/v1/jobs")
    assert response.status_code == 200
    jobs = response.json()
    assert isinstance(jobs, list)
    assert len(jobs) >= 1

    first_job_id = jobs[0]["id"]
    single_res = await async_client.get(f"/api/v1/jobs/{first_job_id}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == first_job_id


@pytest.mark.asyncio
async def test_inbox_authentication_and_ingestion(async_client: httpx.AsyncClient):
    """Verify inbox endpoint auth failure, duplicate checking, and successful ingestion."""
    test_id = uuid.uuid4()
    test_url = f"https://justjoin.it/offers/pytest-job-{test_id}"
    payload = {
        "source_url": test_url,
        "source_portal": "justjoin",
        "title": "Cloud Platform Engineer",
        "company": "TestCorp",
        "locations": ["Warszawa"],
        "description_text": "Extensive Kubernetes and Python experience required.",
    }

    # 1. Unauthenticated request should fail with 401
    unauth_res = await async_client.post("/api/v1/inbox", json=payload)
    assert unauth_res.status_code == 401

    # 2. Invalid token should fail with 401
    bad_token_res = await async_client.post(
        "/api/v1/inbox",
        headers={"Authorization": "Bearer invalid_secret_token"},
        json=payload,
    )
    assert bad_token_res.status_code == 401

    # 3. Check duplicate endpoint before ingestion (should return exists=False)
    check_before = await async_client.get(
        f"/api/v1/inbox/check?url={test_url}",
        headers={"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"},
    )
    assert check_before.status_code == 200
    assert check_before.json()["exists"] is False

    # 4. Valid token with Bearer header should succeed with 201
    valid_res = await async_client.post(
        "/api/v1/inbox",
        headers={"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"},
        json=payload,
    )
    assert valid_res.status_code == 201
    body = valid_res.json()
    assert body["status"] == "inbox"
    assert "id" in body

    # 5. Check duplicate endpoint after ingestion (should return exists=True)
    check_after = await async_client.get(
        f"/api/v1/inbox/check?url={test_url}",
        headers={"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"},
    )
    assert check_after.status_code == 200
    assert check_after.json()["exists"] is True
    assert check_after.json()["job_id"] == body["id"]

    # 6. Valid token with X-API-Token header should also succeed with 201
    payload["source_url"] = f"https://pracuj.pl/praca/pytest-job-{uuid.uuid4()}"
    payload["source_portal"] = "pracuj"
    header_res = await async_client.post(
        "/api/v1/inbox",
        headers={"X-API-Token": settings.EXTENSION_API_TOKEN},
        json=payload,
    )
    assert header_res.status_code == 201


@pytest.mark.asyncio
async def test_cv_preview_and_pdf_export(async_client: httpx.AsyncClient):
    """Verify CV preview multi-page SVG and PDF export endpoints."""
    req_body = {
        "sections": ["summary", "skills", "experience"],
        "language": "pl",
    }

    # 1. Preview multi-page SVG
    preview_res = await async_client.post("/api/v1/cv/preview", json=req_body)
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert "svg_pages" in preview_data
    assert isinstance(preview_data["svg_pages"], list)
    assert len(preview_data["svg_pages"]) >= 1
    assert "<svg" in preview_data["svg_pages"][0]
    assert "<svg" in preview_data["svg_content"]

    # 2. Export PDF
    pdf_res = await async_client.post("/api/v1/cv/export-pdf", json=req_body)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_candidate_profile_read(async_client: httpx.AsyncClient):
    """Verify candidate profile knowledge base retrieval."""
    await async_client.post("/api/v1/candidate/reset-default")
    response = await async_client.get("/api/v1/candidate")
    assert response.status_code == 200
    profile = response.json()
    assert profile["full_name"] == "Jan Kowalski"
    assert "contact_info" in profile
    assert len(profile["sections"]) >= 1


@pytest.mark.asyncio
async def test_batch_job_operations(async_client: httpx.AsyncClient):
    """Verify batch status update and batch delete operations for job offers."""
    # 1. Ingest two offers to test batch operations
    headers = {"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"}
    job1_url = f"https://justjoin.it/offers/batch-test-1-{uuid.uuid4()}"
    job2_url = f"https://justjoin.it/offers/batch-test-2-{uuid.uuid4()}"

    res1 = await async_client.post(
        "/api/v1/inbox",
        headers=headers,
        json={
            "source_url": job1_url,
            "source_portal": "justjoin",
            "title": "Batch Engineer 1",
            "company": "BatchCorp",
        },
    )
    assert res1.status_code == 201
    job1_id = res1.json()["id"]

    res2 = await async_client.post(
        "/api/v1/inbox",
        headers=headers,
        json={
            "source_url": job2_url,
            "source_portal": "justjoin",
            "title": "Batch Engineer 2",
            "company": "BatchCorp",
        },
    )
    assert res2.status_code == 201
    job2_id = res2.json()["id"]

    # 2. Validation check: empty job_ids must return 422
    empty_status_res = await async_client.post(
        "/api/v1/jobs/batch/status",
        json={"job_ids": [], "status": "interview"},
    )
    assert empty_status_res.status_code == 422

    empty_delete_res = await async_client.post(
        "/api/v1/jobs/batch/delete",
        json={"job_ids": []},
    )
    assert empty_delete_res.status_code == 422

    # 3. Batch status update to 'interview'
    batch_status_res = await async_client.post(
        "/api/v1/jobs/batch/status",
        json={"job_ids": [job1_id, job2_id], "status": "interview"},
    )
    assert batch_status_res.status_code == 200
    assert batch_status_res.json()["affected_count"] == 2

    # Verify both jobs now have status 'interview'
    check1 = await async_client.get(f"/api/v1/jobs/{job1_id}")
    assert check1.status_code == 200
    assert check1.json()["status"] == "interview"

    check2 = await async_client.get(f"/api/v1/jobs/{job2_id}")
    assert check2.status_code == 200
    assert check2.json()["status"] == "interview"

    # 4. Batch status update on non-existent UUID returns affected_count=0
    random_uuid = str(uuid.uuid4())
    ghost_status_res = await async_client.post(
        "/api/v1/jobs/batch/status",
        json={"job_ids": [random_uuid], "status": "offer"},
    )
    assert ghost_status_res.status_code == 200
    assert ghost_status_res.json()["affected_count"] == 0

    # 5. Batch delete the two offers
    batch_del_res = await async_client.post(
        "/api/v1/jobs/batch/delete",
        json={"job_ids": [job1_id, job2_id]},
    )
    assert batch_del_res.status_code == 200
    assert batch_del_res.json()["affected_count"] == 2

    # Verify both jobs are deleted (404)
    del_check1 = await async_client.get(f"/api/v1/jobs/{job1_id}")
    assert del_check1.status_code == 404

    del_check2 = await async_client.get(f"/api/v1/jobs/{job2_id}")
    assert del_check2.status_code == 404
