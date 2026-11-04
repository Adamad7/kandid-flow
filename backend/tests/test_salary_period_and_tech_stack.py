"""Unit and integration tests for salary_period and tech_stack_raw ingestion."""

import uuid

import httpx
import pytest
from sqlalchemy import select

from app.config import settings
from app.models.job import JobOffer
from app.schemas.job import StructuredJobData
from app.services.job_parser import JobParserWorker
from tests.conftest import test_session_factory


@pytest.mark.asyncio
async def test_ingest_salary_period_and_tech_stack(async_client: httpx.AsyncClient):
    """Verify that salary_period and tech_stack_raw are correctly ingested and persisted."""
    test_id = uuid.uuid4()
    headers = {"X-API-Token": settings.EXTENSION_API_TOKEN}
    payload = {
        "source_url": f"https://justjoin.it/job-offer/pytest-salary-hourly-{test_id}",
        "source_portal": "justjoin",
        "title": "Applied AI Product Manager",
        "company": "EPAM Systems",
        "salary_raw": "160 - 190 PLN/godz.",
        "salary_min": 160,
        "salary_max": 190,
        "salary_currency": "PLN",
        "salary_period": "hour",
        "description_html": "<div><p>Lead AI products</p><ul><li>Build LLM agents</li></ul></div>",
        "description_text": "Lead AI products\n\n• Build LLM agents",
        "requirements_raw": ["Product Management (master)", "English (B2)"],
        "tech_stack_raw": [
            "English (B2)",
            "Product Management (master)",
            "Applied AI (master)",
            "Large Language Models (advanced)",
        ],
        "locations": ["Katowice"],
        "work_model": "remote",
    }

    resp = await async_client.post("/api/v1/inbox", json=payload, headers=headers)
    assert resp.status_code == 201
    job_id = resp.json()["id"]

    # Verify directly in database using test_session_factory
    async with test_session_factory() as session:
        stmt = select(JobOffer).where(JobOffer.id == job_id)
        res = await session.execute(stmt)
        job = res.scalar_one_or_none()

        assert job is not None
        assert job.salary_min == 160
        assert job.salary_max == 190
        assert job.salary_period == "hour"
        assert job.raw_payload["salary_period"] == "hour"
        assert len(job.raw_payload["tech_stack_raw"]) == 4
        assert "Product Management (master)" in job.raw_payload["tech_stack_raw"]

        # Run traditional parsing on the job
        worker = JobParserWorker()
        await worker.parse_job(session, job, mode="traditional")

        assert job.status == "ready"
        assert job.structured_data is not None
        structured = StructuredJobData.model_validate(job.structured_data)
        # Tech stack should retain tech_stack_raw
        assert "English (B2)" in structured.tech_stack
        assert "Product Management (master)" in structured.tech_stack


@pytest.mark.asyncio
async def test_single_salary_amount_ingest(async_client: httpx.AsyncClient):
    """Verify single-amount salary (no range, min == max)."""
    test_id = uuid.uuid4()
    headers = {"X-API-Token": settings.EXTENSION_API_TOKEN}
    payload = {
        "source_url": f"https://justjoin.it/job-offer/pytest-single-amount-{test_id}",
        "source_portal": "justjoin",
        "title": "Junior Python Developer",
        "company": "Acme Corp",
        "salary_raw": "5000 PLN",
        "salary_min": 5000,
        "salary_max": 5000,
        "salary_currency": "PLN",
        "salary_period": "month",
        "description_text": "Junior Python developer vacancy",
    }

    resp = await async_client.post("/api/v1/inbox", json=payload, headers=headers)
    assert resp.status_code == 201
    job_id = resp.json()["id"]

    async with test_session_factory() as session:
        stmt = select(JobOffer).where(JobOffer.id == job_id)
        res = await session.execute(stmt)
        job = res.scalar_one_or_none()

        assert job is not None
        assert job.salary_min == 5000
        assert job.salary_max == 5000
        assert job.salary_period == "month"
