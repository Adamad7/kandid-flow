"""Unit and integration tests for Job Offer Archive functionality."""

import uuid
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from sqlalchemy import select

from app.models.event import RecruitmentEvent
from app.models.job import JobOffer
from app.services.job_parser import auto_archive_expired_jobs
from tests.conftest import test_session_factory as db_session_factory


def create_job(url: str, **kwargs) -> JobOffer:
    """Helper to instantiate JobOffer with valid raw_payload."""
    portal = kwargs.pop("source_portal", "justjoin")
    raw = kwargs.pop(
        "raw_payload",
        {
            "source_url": url,
            "source_portal": portal,
            "title": kwargs.get("role_title", "Software Engineer"),
            "company": kwargs.get("company_name", "Test Corp"),
        },
    )
    return JobOffer(
        source_url=url,
        source_portal=portal,
        raw_payload=raw,
        **kwargs,
    )


@pytest.mark.asyncio
async def test_auto_archive_moves_expired_unapplied_jobs():
    """Verify auto_archive_expired_jobs moves expired unapplied jobs to archived."""
    today = datetime.now(UTC).date()
    url_id_1 = uuid.uuid4()
    url_id_2 = uuid.uuid4()

    job_expired_ready = create_job(
        url=f"https://justjoin.it/offers/pytest-archive-ready-{url_id_1}",
        company_name="ArchiveCorp 1",
        role_title="Backend Developer",
        status="ready",
        application_deadline=today - timedelta(days=2),
        applied_at=None,
    )
    job_expired_inbox = create_job(
        url=f"https://justjoin.it/offers/pytest-archive-inbox-{url_id_2}",
        company_name="ArchiveCorp 2",
        role_title="DevOps Engineer",
        status="inbox",
        application_deadline=today - timedelta(days=1),
        applied_at=None,
    )

    async with db_session_factory() as session:
        session.add_all([job_expired_ready, job_expired_inbox])
        await session.commit()
        await session.refresh(job_expired_ready)
        await session.refresh(job_expired_inbox)

    async with db_session_factory() as session:
        affected_ids = await auto_archive_expired_jobs(session)
        assert job_expired_ready.id in affected_ids
        assert job_expired_inbox.id in affected_ids

    # Verify statuses updated in DB
    async with db_session_factory() as session:
        res1 = await session.execute(select(JobOffer).where(JobOffer.id == job_expired_ready.id))
        j1 = res1.scalar_one()
        assert j1.status == "archived"

        res2 = await session.execute(select(JobOffer).where(JobOffer.id == job_expired_inbox.id))
        j2 = res2.scalar_one()
        assert j2.status == "archived"


@pytest.mark.asyncio
async def test_auto_archive_does_not_move_applied_or_non_expired_jobs():
    """Verify applied, future-deadline, or deadline-free jobs are never auto-archived."""
    today = datetime.now(UTC).date()
    url_id = uuid.uuid4()

    job_applied_expired = create_job(
        url=f"https://justjoin.it/offers/pytest-archive-applied-{url_id}",
        company_name="ArchiveCorp 3",
        role_title="Applied Engineer",
        status="applied",
        application_deadline=today - timedelta(days=3),
        applied_at=datetime.now(UTC) - timedelta(days=4),
    )
    job_future_deadline = create_job(
        url=f"https://justjoin.it/offers/pytest-archive-future-{url_id}",
        company_name="ArchiveCorp 4",
        role_title="Future Engineer",
        status="ready",
        application_deadline=today + timedelta(days=5),
        applied_at=None,
    )
    job_no_deadline = create_job(
        url=f"https://justjoin.it/offers/pytest-archive-nodeadline-{url_id}",
        company_name="ArchiveCorp 5",
        role_title="No Deadline Engineer",
        status="ready",
        application_deadline=None,
        applied_at=None,
    )

    async with db_session_factory() as session:
        session.add_all([job_applied_expired, job_future_deadline, job_no_deadline])
        await session.commit()
        await session.refresh(job_applied_expired)
        await session.refresh(job_future_deadline)
        await session.refresh(job_no_deadline)

    async with db_session_factory() as session:
        affected_ids = await auto_archive_expired_jobs(session)
        assert job_applied_expired.id not in affected_ids
        assert job_future_deadline.id not in affected_ids
        assert job_no_deadline.id not in affected_ids

    async with db_session_factory() as session:
        res = await session.execute(
            select(JobOffer).where(
                JobOffer.id.in_(
                    [job_applied_expired.id, job_future_deadline.id, job_no_deadline.id]
                )
            )
        )
        jobs = {j.id: j for j in res.scalars().all()}
        assert jobs[job_applied_expired.id].status == "applied"
        assert jobs[job_future_deadline.id].status == "ready"
        assert jobs[job_no_deadline.id].status == "ready"


@pytest.mark.asyncio
async def test_list_jobs_archived_filter(async_client: httpx.AsyncClient):
    """Verify list_jobs filters archived offers according to the archived query parameter."""
    today = datetime.now(UTC).date()
    url_id = uuid.uuid4()

    active_job = create_job(
        url=f"https://justjoin.it/offers/pytest-list-active-{url_id}",
        company_name="Active Corp",
        role_title="Active Role",
        status="ready",
        application_deadline=today + timedelta(days=10),
        applied_at=None,
    )
    archived_job = create_job(
        url=f"https://justjoin.it/offers/pytest-list-archived-{url_id}",
        company_name="Archived Corp",
        role_title="Archived Role",
        status="archived",
        application_deadline=today - timedelta(days=1),
        applied_at=None,
    )

    async with db_session_factory() as session:
        session.add_all([active_job, archived_job])
        await session.commit()
        await session.refresh(active_job)
        await session.refresh(archived_job)

    # 1. Default (archived=False) should include active_job and exclude archived_job
    res_default = await async_client.get("/api/v1/jobs")
    assert res_default.status_code == 200
    ids_default = [j["id"] for j in res_default.json()]
    assert str(active_job.id) in ids_default
    assert str(archived_job.id) not in ids_default

    # 2. Explicit archived=false
    res_active = await async_client.get("/api/v1/jobs?archived=false")
    assert res_active.status_code == 200
    ids_active = [j["id"] for j in res_active.json()]
    assert str(active_job.id) in ids_active
    assert str(archived_job.id) not in ids_active

    # 3. Explicit archived=true
    res_archived = await async_client.get("/api/v1/jobs?archived=true")
    assert res_archived.status_code == 200
    ids_archived = [j["id"] for j in res_archived.json()]
    assert str(archived_job.id) in ids_archived
    assert str(active_job.id) not in ids_archived

    # 4. Filter by status=archived
    res_status_archived = await async_client.get("/api/v1/jobs?status=archived")
    assert res_status_archived.status_code == 200
    ids_status_archived = [j["id"] for j in res_status_archived.json()]
    assert str(archived_job.id) in ids_status_archived
    assert str(active_job.id) not in ids_status_archived


@pytest.mark.asyncio
async def test_restore_expired_unapplied_job_to_ready_raises_400(
    async_client: httpx.AsyncClient,
):
    """Verify attempting to restore an expired unapplied job to ready/inbox raises HTTP 400."""
    today = datetime.now(UTC).date()
    url_id = uuid.uuid4()

    expired_archived_job = create_job(
        url=f"https://justjoin.it/offers/pytest-restore-block-{url_id}",
        company_name="Block Corp",
        role_title="Expired Role",
        status="archived",
        application_deadline=today - timedelta(days=2),
        applied_at=None,
    )

    async with db_session_factory() as session:
        session.add(expired_archived_job)
        await session.commit()
        await session.refresh(expired_archived_job)

    # 1. Attempt PATCH to 'ready'
    patch_res = await async_client.patch(
        f"/api/v1/jobs/{expired_archived_job.id}",
        json={"status": "ready"},
    )
    assert patch_res.status_code == 400
    assert "Nie można przywrócić oferty do etapu przygotowania" in patch_res.json()["detail"]

    # 2. Attempt PATCH to 'inbox'
    patch_inbox_res = await async_client.patch(
        f"/api/v1/jobs/{expired_archived_job.id}",
        json={"status": "inbox"},
    )
    assert patch_inbox_res.status_code == 400
    assert "Nie można przywrócić oferty do etapu przygotowania" in patch_inbox_res.json()["detail"]

    # 3. Attempt batch status update to 'ready'
    batch_res = await async_client.post(
        "/api/v1/jobs/batch/status",
        json={"job_ids": [str(expired_archived_job.id)], "status": "ready"},
    )
    assert batch_res.status_code == 400
    assert "Nie można przywrócić oferty do etapu przygotowania" in batch_res.json()["detail"]


@pytest.mark.asyncio
async def test_restore_expired_job_to_applied_succeeds(
    async_client: httpx.AsyncClient,
):
    """Verify restoring an expired job to 'applied' succeeds.
    Sets applied_at and preserves deadline.
    """
    today = datetime.now(UTC).date()
    deadline = today - timedelta(days=3)
    url_id = uuid.uuid4()

    expired_archived_job = create_job(
        url=f"https://justjoin.it/offers/pytest-restore-applied-{url_id}",
        company_name="Applied Restore Corp",
        role_title="Applied Role",
        status="archived",
        application_deadline=deadline,
        applied_at=None,
    )

    async with db_session_factory() as session:
        session.add(expired_archived_job)
        await session.commit()
        await session.refresh(expired_archived_job)

    # Restore to applied
    patch_res = await async_client.patch(
        f"/api/v1/jobs/{expired_archived_job.id}",
        json={"status": "applied"},
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["status"] == "applied"
    assert data["applied_at"] is not None
    assert data["application_deadline"] == str(deadline)

    # Verify application_submitted timeline event created
    async with db_session_factory() as session:
        ev_res = await session.execute(
            select(RecruitmentEvent).where(
                RecruitmentEvent.job_offer_id == expired_archived_job.id,
                RecruitmentEvent.event_type == "application_submitted",
            )
        )
        event = ev_res.scalar_one_or_none()
        assert event is not None
        assert event.title == "Wysłano aplikację"


@pytest.mark.asyncio
async def test_restore_non_expired_archived_job_to_ready_succeeds(
    async_client: httpx.AsyncClient,
):
    """Verify restoring a non-expired archived job to 'ready' succeeds."""
    today = datetime.now(UTC).date()
    deadline = today + timedelta(days=7)
    url_id = uuid.uuid4()

    future_archived_job = create_job(
        url=f"https://justjoin.it/offers/pytest-restore-future-{url_id}",
        company_name="Future Restore Corp",
        role_title="Future Role",
        status="archived",
        application_deadline=deadline,
        applied_at=None,
    )

    async with db_session_factory() as session:
        session.add(future_archived_job)
        await session.commit()
        await session.refresh(future_archived_job)

    patch_res = await async_client.patch(
        f"/api/v1/jobs/{future_archived_job.id}",
        json={"status": "ready"},
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["status"] == "ready"


@pytest.mark.asyncio
async def test_analytics_overview_archived_count(
    async_client: httpx.AsyncClient,
):
    """Verify GET /api/v1/analytics/overview returns accurate archived_count."""
    url_id = uuid.uuid4()

    archived_job_1 = create_job(
        url=f"https://justjoin.it/offers/pytest-analytics-arch-1-{url_id}",
        company_name="Arch Analytics 1",
        role_title="Archived Role 1",
        status="archived",
    )
    archived_job_2 = create_job(
        url=f"https://justjoin.it/offers/pytest-analytics-arch-2-{url_id}",
        company_name="Arch Analytics 2",
        role_title="Archived Role 2",
        status="archived",
    )

    async with db_session_factory() as session:
        session.add_all([archived_job_1, archived_job_2])
        await session.commit()

    res = await async_client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert "archived_count" in data
    assert data["archived_count"] >= 2
