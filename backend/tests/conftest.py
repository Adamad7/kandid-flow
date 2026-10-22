"""Pytest fixtures and configuration."""

from collections.abc import AsyncGenerator

import httpx
import pytest
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.database import get_db_session
from app.main import app
from app.models.cv import CVVersion
from app.models.job import JobOffer

test_engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
    future=True,
)

test_session_factory = async_sessionmaker(
    bind=test_engine,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency override providing isolated sessions without cross-loop pooling."""
    async with test_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db_session] = override_get_db_session


@pytest.fixture(scope="session", autouse=True)
async def session_cleanup_lingering_test_jobs() -> AsyncGenerator[None, None]:
    """Purge lingering test job offers and linked CV versions before and after the session."""

    async def _purge() -> None:
        async with test_session_factory() as session:
            test_job_ids_subquery = select(JobOffer.id).where(
                or_(
                    JobOffer.source_url.ilike("%pytest%"),
                    JobOffer.source_url.ilike("%realtime%"),
                    JobOffer.source_url.ilike("%batch%"),
                    JobOffer.source_url.ilike("%example.com%"),
                )
            )
            await session.execute(
                delete(CVVersion).where(CVVersion.job_offer_id.in_(test_job_ids_subquery))
            )
            await session.execute(
                delete(JobOffer).where(
                    or_(
                        JobOffer.source_url.ilike("%pytest%"),
                        JobOffer.source_url.ilike("%realtime%"),
                        JobOffer.source_url.ilike("%batch%"),
                        JobOffer.source_url.ilike("%example.com%"),
                    )
                )
            )
            await session.commit()

    await _purge()
    try:
        yield
    finally:
        await _purge()


@pytest.fixture(autouse=True)
async def cleanup_database_records() -> AsyncGenerator[None, None]:
    """Track and purge any JobOffer and CVVersion records created during each test execution."""
    async with test_session_factory() as session:
        pre_test_cv_ids = set((await session.execute(select(CVVersion.id))).scalars().all())
        pre_test_job_ids = set((await session.execute(select(JobOffer.id))).scalars().all())

    try:
        yield
    finally:
        async with test_session_factory() as session:
            # 1. Delete CV versions first to preserve FK constraints
            post_test_cv_ids = set((await session.execute(select(CVVersion.id))).scalars().all())
            new_cv_ids = post_test_cv_ids - pre_test_cv_ids
            if new_cv_ids:
                await session.execute(delete(CVVersion).where(CVVersion.id.in_(new_cv_ids)))

            # 2. Delete Job offers
            post_test_job_ids = set((await session.execute(select(JobOffer.id))).scalars().all())
            new_job_ids = post_test_job_ids - pre_test_job_ids
            if new_job_ids:
                await session.execute(delete(JobOffer).where(JobOffer.id.in_(new_job_ids)))

            await session.commit()


@pytest.fixture
async def sample_job_offer() -> AsyncGenerator[JobOffer, None]:
    """Provide an isolated JobOffer instance for CV generation and tailoring tests."""
    import uuid

    url = f"https://pracuj.pl/praca/pytest-cv-job-{uuid.uuid4()}"
    portal = "pracuj"
    job = JobOffer(
        source_url=url,
        source_portal=portal,
        company_name="Pytest Corp",
        role_title="Senior Python Engineer",
        status="ready",
        work_model="hybrid",
        work_model_details="2 dni w biurze",
        raw_payload={
            "source_url": url,
            "source_portal": portal,
            "title": "Senior Python Engineer",
            "company": "Pytest Corp",
            "description_text": (
                "Poszukujemy Senior Python Engineera z dobrą znajomością "
                "FastAPI, PostgreSQL i Docker."
            ),
            "requirements_raw": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        },
        structured_data={
            "role_summary": (
                "Senior Python Engineer role focusing on FastAPI and cloud architecture."
            ),
            "must_have": ["Python", "FastAPI", "PostgreSQL"],
            "nice_to_have": ["Docker", "Kubernetes"],
            "tech_stack": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            "benefits": ["B2B", "Remote"],
            "experience_level": "Senior",
        },
    )
    async with test_session_factory() as session:
        session.add(job)
        await session.commit()
        await session.refresh(job)

    yield job


@pytest.fixture
async def async_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client bound to FastAPI application."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
