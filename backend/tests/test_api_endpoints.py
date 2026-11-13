import uuid

import httpx
import pytest

from app.config import settings
from app.services.job_parser import canonicalize_url


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
        f"/api/v1/inbox/check?url={test_url}&title={payload['title']}&company={payload['company']}",
        headers={"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"},
    )
    assert check_before.status_code == 200
    assert check_before.json()["exists"] is False

    created_job_ids: list[str] = []
    try:
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
        created_job_ids.append(body["id"])

        # 5. Check duplicate endpoint after ingestion (should return exists=True)
        check_after = await async_client.get(
            f"/api/v1/inbox/check?url={test_url}&title={payload['title']}&company={payload['company']}",
            headers={"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"},
        )
        assert check_after.status_code == 200
        assert check_after.json()["exists"] is True
        assert check_after.json()["job_id"] == body["id"]
        assert check_after.json()["role_title"] == payload["title"]
        assert check_after.json()["company_name"] == payload["company"]

        # 6. Valid token with X-API-Token header should also succeed with 201 (new offer)
        payload["source_url"] = f"https://pracuj.pl/praca/pytest-job-{uuid.uuid4()}"
        payload["source_portal"] = "pracuj"
        payload["title"] = f"Cloud Architect {uuid.uuid4().hex[:6]}"
        header_res = await async_client.post(
            "/api/v1/inbox",
            headers={"X-API-Token": settings.EXTENSION_API_TOKEN},
            json=payload,
        )
        assert header_res.status_code == 201
        created_job_ids.append(header_res.json()["id"])
    finally:
        if created_job_ids:
            await async_client.post(
                "/api/v1/jobs/batch/delete",
                json={"job_ids": created_job_ids},
            )


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

    created_job_ids: list[str] = []
    try:
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
        created_job_ids.append(job1_id)

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
        created_job_ids.append(job2_id)

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
    finally:
        if created_job_ids:
            await async_client.post(
                "/api/v1/jobs/batch/delete",
                json={"job_ids": created_job_ids},
            )


@pytest.mark.asyncio
async def test_application_timeline_two_way_sync(async_client: httpx.AsyncClient):
    """Verify bidirectional sync between application_submitted event and job.applied_at."""
    token = settings.EXTENSION_API_TOKEN
    headers = {"Authorization": f"Bearer {token}"}
    job_url = f"https://justjoin.it/offers/pytest-sync-{uuid.uuid4()}"

    res = await async_client.post(
        "/api/v1/inbox",
        headers=headers,
        json={
            "source_url": job_url,
            "source_portal": "justjoin",
            "title": "Backend Sync Engineer",
            "company": "SyncCorp",
        },
    )
    assert res.status_code == 201
    job_id = res.json()["id"]

    try:
        # Verify initial job state
        job_res = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert job_res.status_code == 200
        assert job_res.json()["applied_at"] is None

        # 1. Create application_submitted event -> should set job.applied_at and status = applied
        app_date = "2026-10-24T12:00:00Z"
        event_payload = {
            "job_offer_id": job_id,
            "event_type": "application_submitted",
            "title": "Wysłano aplikację",
            "scheduled_at": app_date,
            "duration_minutes": 0,
            "notes": "Test submission notes",
            "is_completed": True,
        }
        create_ev_res = await async_client.post("/api/v1/events", json=event_payload)
        assert create_ev_res.status_code == 201
        event_id = create_ev_res.json()["id"]

        # Check job is updated
        job_check = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert job_check.status_code == 200
        assert job_check.json()["status"] == "applied"
        assert job_check.json()["applied_at"] is not None

        # 2. Update event scheduled_at -> should update job.applied_at
        new_app_date = "2026-10-25T15:30:00Z"
        up_ev_res = await async_client.patch(
            f"/api/v1/events/{event_id}",
            json={"scheduled_at": new_app_date},
        )
        assert up_ev_res.status_code == 200

        job_check2 = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert job_check2.status_code == 200
        assert "2026-10-25" in job_check2.json()["applied_at"]

        # 3. Update job.applied_at directly via PATCH /jobs/{id} -> should update event scheduled_at
        job_patch_date = "2026-10-26T09:00:00Z"
        patch_job_res = await async_client.patch(
            f"/api/v1/jobs/{job_id}",
            json={"applied_at": job_patch_date},
        )
        assert patch_job_res.status_code == 200

        ev_check = await async_client.get(f"/api/v1/events/{event_id}")
        assert ev_check.status_code == 200
        assert "2026-10-26" in ev_check.json()["scheduled_at"]

        # 4. Delete application event -> should clear job.applied_at to None
        del_ev_res = await async_client.delete(f"/api/v1/events/{event_id}")
        assert del_ev_res.status_code == 204

        job_check3 = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert job_check3.status_code == 200
        assert job_check3.json()["applied_at"] is None
    finally:
        await async_client.delete(f"/api/v1/jobs/{job_id}")


@pytest.mark.asyncio
async def test_inbox_work_model_details_sanitization(async_client: httpx.AsyncClient):
    """Verify generic work_model_details are sanitized to None during creation and update."""
    test_url = f"https://justjoin.it/offers/sanitize-test-{uuid.uuid4()}"
    headers = {"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"}

    payload = {
        "source_url": test_url,
        "source_portal": "justjoin",
        "title": "Python Specialist",
        "company": "SanitizeCorp",
        "work_model": "remote",
        "work_model_details": "Zdalnie",
        "description_text": "Python developer role.",
    }

    # 1. Create with generic label 'Zdalnie' -> should sanitize to None
    create_res = await async_client.post("/api/v1/inbox", headers=headers, json=payload)
    assert create_res.status_code == 201
    job_id = create_res.json()["id"]

    try:
        job_check = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert job_check.status_code == 200
        assert job_check.json()["work_model"] == "remote"
        assert job_check.json()["work_model_details"] is None

        # 2. Update with concise schedule -> should be preserved
        payload["work_model"] = "hybrid"
        payload["work_model_details"] = "Hybrydowo: 1-2 dni w biurze"
        update_res = await async_client.post("/api/v1/inbox", headers=headers, json=payload)
        assert update_res.status_code == 201

        job_check2 = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert job_check2.status_code == 200
        assert job_check2.json()["work_model"] == "hybrid"
        assert job_check2.json()["work_model_details"] == "Hybrydowo: 1-2 dni w biurze"

        # 3. Update with generic label 'Stacjonarnie' -> should sanitize to None
        payload["work_model_details"] = "Stacjonarnie"
        update_res2 = await async_client.post("/api/v1/inbox", headers=headers, json=payload)
        assert update_res2.status_code == 201

        job_check3 = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert job_check3.status_code == 200
        assert job_check3.json()["work_model_details"] is None
    finally:
        await async_client.delete(f"/api/v1/jobs/{job_id}")


@pytest.mark.asyncio
async def test_job_offer_rating_lifecycle(async_client: httpx.AsyncClient):
    """Verify rating default value, updates via inbox & PATCH, and validation constraints."""
    test_url = f"https://justjoin.it/offers/rating-test-{uuid.uuid4()}"
    headers = {"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"}

    # 1. Ingest without rating -> defaults to 1
    payload = {
        "source_url": test_url,
        "source_portal": "justjoin",
        "title": "Rating QA Engineer",
        "company": "RatingCorp",
        "description_text": "Role testing rating lifecycle.",
    }
    create_res = await async_client.post("/api/v1/inbox", headers=headers, json=payload)
    assert create_res.status_code == 201
    job_id = create_res.json()["id"]

    try:
        get_res = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert get_res.status_code == 200
        assert get_res.json()["rating"] == 1

        # 2. Re-ingest with updated rating=4
        payload["rating"] = 4
        update_inbox_res = await async_client.post("/api/v1/inbox", headers=headers, json=payload)
        assert update_inbox_res.status_code == 201

        get_res2 = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert get_res2.status_code == 200
        assert get_res2.json()["rating"] == 4

        # 3. PATCH rating to 5
        patch_res = await async_client.patch(f"/api/v1/jobs/{job_id}", json={"rating": 5})
        assert patch_res.status_code == 200
        assert patch_res.json()["rating"] == 5

        # 4. Ingest with invalid rating (< 1) -> 422
        bad_url = f"https://justjoin.it/offers/rating-bad-{uuid.uuid4()}"
        bad_payload_low = {**payload, "source_url": bad_url, "rating": 0}
        res_bad_low = await async_client.post(
            "/api/v1/inbox", headers=headers, json=bad_payload_low
        )
        assert res_bad_low.status_code == 422

        # 5. Ingest with invalid rating (> 5) -> 422
        bad_payload_high = {**payload, "source_url": bad_url, "rating": 6}
        res_bad_high = await async_client.post(
            "/api/v1/inbox", headers=headers, json=bad_payload_high
        )
        assert res_bad_high.status_code == 422

        # 6. PATCH with invalid rating (< 1 or > 5) -> 422
        patch_bad_low = await async_client.patch(f"/api/v1/jobs/{job_id}", json={"rating": 0})
        assert patch_bad_low.status_code == 422

        patch_bad_high = await async_client.patch(f"/api/v1/jobs/{job_id}", json={"rating": 6})
        assert patch_bad_high.status_code == 422
    finally:
        await async_client.delete(f"/api/v1/jobs/{job_id}")


@pytest.mark.asyncio
async def test_job_next_interview_at_population(async_client: httpx.AsyncClient):
    """Verify next_interview_at is properly computed and returned for jobs."""
    from datetime import UTC, datetime, timedelta

    headers = {"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"}
    test_id = uuid.uuid4()
    test_url = f"https://justjoin.it/offers/interview-test-{test_id}"
    payload = {
        "source_url": test_url,
        "source_portal": "justjoin",
        "title": "Interview Test Engineer",
        "company": "InterviewCorp",
        "description_text": "Role for testing next_interview_at population.",
    }

    create_res = await async_client.post("/api/v1/inbox", headers=headers, json=payload)
    assert create_res.status_code == 201
    job_id = create_res.json()["id"]

    try:
        # Initially, no events -> next_interview_at should be None
        get_res = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert get_res.status_code == 200
        assert get_res.json()["next_interview_at"] is None

        # Add a completed event in future
        now = datetime.now(UTC)
        ev_comp_payload = {
            "job_offer_id": job_id,
            "event_type": "hr_screening",
            "title": "Initial screening",
            "scheduled_at": (now + timedelta(days=1)).isoformat(),
            "is_completed": True,
        }
        ev1_res = await async_client.post("/api/v1/events", json=ev_comp_payload)
        assert ev1_res.status_code == 201

        # Still None because it is completed
        get_res = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert get_res.json()["next_interview_at"] is None

        # Add upcoming uncompleted event in 3 days
        future_dt_3d = now + timedelta(days=3)
        ev_later_payload = {
            "job_offer_id": job_id,
            "event_type": "technical_interview",
            "title": "Technical stage",
            "scheduled_at": future_dt_3d.isoformat(),
            "is_completed": False,
        }
        ev2_res = await async_client.post("/api/v1/events", json=ev_later_payload)
        assert ev2_res.status_code == 201

        # Add earlier uncompleted event in 2 days
        future_dt_2d = now + timedelta(days=2)
        ev_earlier_payload = {
            "job_offer_id": job_id,
            "event_type": "manager_interview",
            "title": "Manager interview",
            "scheduled_at": future_dt_2d.isoformat(),
            "is_completed": False,
        }
        ev3_res = await async_client.post("/api/v1/events", json=ev_earlier_payload)
        assert ev3_res.status_code == 201

        # get_job_by_id should return the earliest event (in 2 days)
        get_res = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert get_res.status_code == 200
        next_dt_iso = get_res.json()["next_interview_at"]
        assert next_dt_iso is not None
        next_dt = datetime.fromisoformat(next_dt_iso)
        assert abs((next_dt - future_dt_2d).total_seconds()) < 5

        # list_jobs should also contain next_interview_at
        list_res = await async_client.get("/api/v1/jobs")
        assert list_res.status_code == 200
        job_item = next((j for j in list_res.json() if j["id"] == job_id), None)
        assert job_item is not None
        assert job_item["next_interview_at"] is not None
        list_dt = datetime.fromisoformat(job_item["next_interview_at"])
        assert abs((list_dt - future_dt_2d).total_seconds()) < 5

        # update_job_by_id should also return next_interview_at
        patch_res = await async_client.patch(f"/api/v1/jobs/{job_id}", json={"status": "interview"})
        assert patch_res.status_code == 200
        assert patch_res.json()["next_interview_at"] is not None

    finally:
        await async_client.delete(f"/api/v1/jobs/{job_id}")


@pytest.mark.asyncio
async def test_theprotocol_inbox_ingestion_and_url_canonicalization(
    async_client: httpx.AsyncClient,
):
    """Verify ingestion, URL canonicalization, duplicate check, and portal filtering."""
    # 1. Direct unit verification of canonicalize_url for theprotocol.it URLs
    raw_proto_url = (
        "https://theprotocol.it/szczegoly/praca/senior-python-dev-warszawa,7d9a3b/?"
        "searchId=550e8400-e29b-41d4-a716-446655440000&utm_source=theprotocol&utm_medium=email"
    )
    expected_proto_url = "https://theprotocol.it/szczegoly/praca/senior-python-dev-warszawa,7d9a3b"
    assert canonicalize_url(raw_proto_url) == expected_proto_url

    # 2. Ingest via inbox API endpoint
    job_uuid = uuid.uuid4().hex[:8]
    clean_base = f"https://theprotocol.it/szczegoly/praca/python-dev-{job_uuid}"
    tracking_query = "?searchId=test-uuid-123&utm_source=theprotocol&utm_campaign=winter2026"
    dirty_url = f"{clean_base}/{tracking_query}"

    payload = {
        "source_url": dirty_url,
        "source_portal": "theprotocol",
        "title": "Senior Python Developer",
        "company": "Protocol Soft",
        "locations": ["Warszawa", "Kraków"],
        "description_text": "Python 3.12, FastAPI, and Docker expertise required.",
        "salary_raw": "20 000 - 25 000 PLN",
        "salary_min": 20000,
        "salary_max": 25000,
        "salary_currency": "PLN",
        "salary_period": "month",
        "work_model": "hybrid",
    }

    created_job_ids: list[str] = []
    try:
        res = await async_client.post(
            "/api/v1/inbox",
            headers={"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"},
            json=payload,
        )
        assert res.status_code == 201
        data = res.json()
        job_id = data["id"]
        created_job_ids.append(job_id)

        # 3. Verify stored job attributes and canonical URL
        job_res = await async_client.get(f"/api/v1/jobs/{job_id}")
        assert job_res.status_code == 200
        job_data = job_res.json()
        assert job_data["source_portal"] == "theprotocol"
        assert job_data["source_url"] == clean_base
        assert not job_data["source_url"].endswith("/")
        assert "searchId" not in job_data["source_url"]
        assert "utm_" not in job_data["source_url"]

        # 4. Duplicate check with alternate tracking query parameters
        another_dirty_url = f"{clean_base}/?searchId=different-id&utm_term=python#tab-details"
        check_res = await async_client.get(
            "/api/v1/inbox/check",
            params={
                "url": another_dirty_url,
                "title": payload["title"],
                "company": payload["company"],
            },
            headers={"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"},
        )
        assert check_res.status_code == 200
        check_data = check_res.json()
        assert check_data["exists"] is True
        assert check_data["job_id"] == job_id

        # 5. Filter jobs by source_portal=theprotocol
        filter_res = await async_client.get("/api/v1/jobs?source_portal=theprotocol")
        assert filter_res.status_code == 200
        filtered_jobs = filter_res.json()
        assert any(j["id"] == job_id for j in filtered_jobs)

        # 6. Verify analytics portal display mapping for theprotocol
        analytics_res = await async_client.get("/api/v1/analytics/overview")
        assert analytics_res.status_code == 200
        analytics_data = analytics_res.json()
        portal_metrics = analytics_data.get("portal_performance", [])
        theprotocol_metric = next((m for m in portal_metrics if m["portal"] == "theprotocol"), None)
        if theprotocol_metric:
            assert theprotocol_metric["label"] == "the:protocol"
    finally:
        if created_job_ids:
            await async_client.post(
                "/api/v1/jobs/batch/delete",
                json={"job_ids": created_job_ids},
            )


@pytest.mark.asyncio
async def test_inbox_duplicate_detection_matrix(async_client: httpx.AsyncClient):
    """Verify duplicate detection rules based on title, company, and deadline."""
    auth_headers = {"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"}
    created_job_ids: list[str] = []

    try:
        # 1. Missing or empty title / company returns 200 with exists=False
        res_no_params = await async_client.get("/api/v1/inbox/check", headers=auth_headers)
        assert res_no_params.status_code == 200
        assert res_no_params.json()["exists"] is False

        res_ping_url = await async_client.get(
            "/api/v1/inbox/check?url=https://justjoin.it/offers/ping-test",
            headers=auth_headers,
        )
        assert res_ping_url.status_code == 200
        assert res_ping_url.json()["exists"] is False

        res_only_title = await async_client.get(
            "/api/v1/inbox/check?title=Software%20Engineer",
            headers=auth_headers,
        )
        assert res_only_title.status_code == 200
        assert res_only_title.json()["exists"] is False

        res_whitespace = await async_client.get(
            "/api/v1/inbox/check?title=%20%20&company=%20%20",
            headers=auth_headers,
        )
        assert res_whitespace.status_code == 200
        assert res_whitespace.json()["exists"] is False

        # 2. Ingest first job offer with a deadline
        unique_suffix = uuid.uuid4().hex[:8]
        title_a = f"Senior DevOps Specialist {unique_suffix}"
        company_a = f"CloudScale Inc {unique_suffix}"
        deadline_a = "2026-12-31"

        offer_1_payload = {
            "source_url": f"https://justjoin.it/offers/devops-{unique_suffix}",
            "source_portal": "justjoin",
            "title": title_a,
            "company": company_a,
            "application_deadline": deadline_a,
            "salary_min": 18000,
            "salary_max": 24000,
            "description_text": "Terraform and AWS required.",
        }

        res_create_1 = await async_client.post(
            "/api/v1/inbox",
            headers=auth_headers,
            json=offer_1_payload,
        )
        assert res_create_1.status_code == 201
        job_1_id = res_create_1.json()["id"]
        created_job_ids.append(job_1_id)

        # 3. Duplicate check from a DIFFERENT portal with identical title, company, deadline
        diff_portal_url = f"https://pracuj.pl/praca/devops-pracuj-{unique_suffix}"
        res_check_dup = await async_client.get(
            "/api/v1/inbox/check",
            params={
                "url": diff_portal_url,
                "title": title_a,
                "company": company_a,
                "application_deadline": deadline_a,
            },
            headers=auth_headers,
        )
        assert res_check_dup.status_code == 200
        dup_data = res_check_dup.json()
        assert dup_data["exists"] is True
        assert dup_data["job_id"] == job_1_id
        assert dup_data["role_title"] == title_a
        assert dup_data["company_name"] == company_a

        # 4. Ingesting from Pracuj with different URL updates the existing job
        offer_2_payload = {
            "source_url": diff_portal_url,
            "source_portal": "pracuj",
            "title": title_a,
            "company": company_a,
            "application_deadline": deadline_a,
            "salary_min": 20000,
            "salary_max": 26000,
            "description_text": "Updated text from Pracuj portal.",
        }
        res_update = await async_client.post(
            "/api/v1/inbox",
            headers=auth_headers,
            json=offer_2_payload,
        )
        assert res_update.status_code == 201
        assert res_update.json()["id"] == job_1_id
        assert "zaktualizowana" in res_update.json()["message"]

        # Verify job in DB retained original source_url but updated salary
        job_1_get = await async_client.get(f"/api/v1/jobs/{job_1_id}")
        assert job_1_get.status_code == 200
        job_1_data = job_1_get.json()
        assert job_1_data["source_url"] == offer_1_payload["source_url"]
        assert job_1_data["salary_min"] == 20000
        assert job_1_data["salary_max"] == 26000

        # 5. One offer has deadline, query has None -> treated as duplicate
        res_check_no_deadline = await async_client.get(
            f"/api/v1/inbox/check?title={title_a}&company={company_a}",
            headers=auth_headers,
        )
        assert res_check_no_deadline.status_code == 200
        assert res_check_no_deadline.json()["exists"] is True
        assert res_check_no_deadline.json()["job_id"] == job_1_id

        # 6. Both offers have DIFFERENT deadlines -> treated as separate offers (exists=False)
        diff_deadline = "2027-01-15"
        res_check_diff_deadline = await async_client.get(
            f"/api/v1/inbox/check?title={title_a}&company={company_a}&application_deadline={diff_deadline}",
            headers=auth_headers,
        )
        assert res_check_diff_deadline.status_code == 200
        assert res_check_diff_deadline.json()["exists"] is False

        # Ingesting with different deadline creates a distinct job offer
        offer_diff_deadline_payload = {
            "source_url": f"https://nofluffjobs.com/job/devops-{unique_suffix}-v2",
            "source_portal": "nofluffjobs",
            "title": title_a,
            "company": company_a,
            "application_deadline": diff_deadline,
        }
        res_create_diff = await async_client.post(
            "/api/v1/inbox",
            headers=auth_headers,
            json=offer_diff_deadline_payload,
        )
        assert res_create_diff.status_code == 201
        job_2_id = res_create_diff.json()["id"]
        assert job_2_id != job_1_id
        created_job_ids.append(job_2_id)

        # 7. Job in DB has NO deadline -> query with deadline is treated as duplicate
        title_b = f"Backend Lead {unique_suffix}"
        company_b = f"AlphaTech {unique_suffix}"
        offer_no_date_payload = {
            "source_url": f"https://justjoin.it/offers/lead-{unique_suffix}",
            "source_portal": "justjoin",
            "title": title_b,
            "company": company_b,
            "application_deadline": None,
        }
        res_create_no_date = await async_client.post(
            "/api/v1/inbox",
            headers=auth_headers,
            json=offer_no_date_payload,
        )
        assert res_create_no_date.status_code == 201
        job_3_id = res_create_no_date.json()["id"]
        created_job_ids.append(job_3_id)

        # Query with deadline matches offer with no deadline
        res_check_date_against_none = await async_client.get(
            f"/api/v1/inbox/check?title={title_b}&company={company_b}&application_deadline=2026-11-20",
            headers=auth_headers,
        )
        assert res_check_date_against_none.status_code == 200
        assert res_check_date_against_none.json()["exists"] is True
        assert res_check_date_against_none.json()["job_id"] == job_3_id

        # 8. Different role title or different company -> treated as separate offers
        res_diff_title = await async_client.get(
            f"/api/v1/inbox/check?title=Completely%20Different%20Role&company={company_a}",
            headers=auth_headers,
        )
        assert res_diff_title.status_code == 200
        assert res_diff_title.json()["exists"] is False

        res_diff_company = await async_client.get(
            f"/api/v1/inbox/check?title={title_a}&company=Completely%20Different%20Company",
            headers=auth_headers,
        )
        assert res_diff_company.status_code == 200
        assert res_diff_company.json()["exists"] is False
    finally:
        if created_job_ids:
            await async_client.post(
                "/api/v1/jobs/batch/delete",
                json={"job_ids": created_job_ids},
            )


@pytest.mark.asyncio
async def test_events_with_attachments_serialization(async_client: httpx.AsyncClient):
    """Verify that events with file attachments serialize download_url and list properly."""
    auth_headers = {"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"}
    inbox_res = await async_client.post(
        "/api/v1/inbox",
        headers=auth_headers,
        json={
            "source_url": f"https://example.com/jobs/attachment-event-test-{uuid.uuid4()}",
            "source_portal": "generic",
            "title": "Attachment Event Test Role",
            "company": "Event Attach Corp",
        },
    )
    assert inbox_res.status_code == 201
    job_id = inbox_res.json()["id"]

    try:
        # 1. Create a recruitment event
        event_res = await async_client.post(
            "/api/v1/events",
            json={
                "job_offer_id": job_id,
                "event_type": "application_submitted",
                "title": "Wysłano aplikację z CV",
                "scheduled_at": "2026-11-10T12:00:00Z",
                "duration_minutes": 0,
                "is_completed": True,
            },
        )
        assert event_res.status_code == 201
        event_id = event_res.json()["id"]

        # 2. Upload an attachment linked to this event
        file_content = b"%PDF-1.4 test cv dummy content"
        upload_res = await async_client.post(
            f"/api/v1/jobs/{job_id}/attachments",
            files={"file": ("test_cv.pdf", file_content, "application/pdf")},
            data={"category": "cv_external", "event_id": event_id, "notes": "Attached CV"},
        )
        assert upload_res.status_code == 201
        att_data = upload_res.json()
        expected_url = f"/api/v1/jobs/{job_id}/attachments/{att_data['id']}/download"
        assert att_data["download_url"] == expected_url

        # 3. Create a second recruitment event (interview) without attachments
        interview_res = await async_client.post(
            "/api/v1/events",
            json={
                "job_offer_id": job_id,
                "event_type": "manager_interview",
                "title": "Rozmowa z managerem",
                "scheduled_at": "2026-11-20T10:00:00Z",
                "duration_minutes": 60,
                "is_completed": False,
            },
        )
        assert interview_res.status_code == 201
        interview_id = interview_res.json()["id"]

        # 4. List all events for this job -> MUST succeed with status 200 and serialize attachments
        list_res = await async_client.get(f"/api/v1/events?job_offer_id={job_id}")
        assert list_res.status_code == 200
        events = list_res.json()
        assert len(events) == 2

        app_event = next(e for e in events if e["id"] == event_id)
        assert len(app_event["attachments"]) == 1
        assert (
            app_event["attachments"][0]["download_url"]
            == f"/api/v1/jobs/{job_id}/attachments/{att_data['id']}/download"
        )

        interview_event = next(e for e in events if e["id"] == interview_id)
        assert len(interview_event["attachments"]) == 0
        assert interview_event["title"] == "Rozmowa z managerem"

        # 5. Fetch single event by ID
        get_single = await async_client.get(f"/api/v1/events/{event_id}")
        assert get_single.status_code == 200
        assert len(get_single.json()["attachments"]) == 1
        assert (
            get_single.json()["attachments"][0]["download_url"]
            == f"/api/v1/jobs/{job_id}/attachments/{att_data['id']}/download"
        )
    finally:
        await async_client.delete(f"/api/v1/jobs/{job_id}")
