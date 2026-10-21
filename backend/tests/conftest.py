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
    """Purge any lingering test job offers before and after the test session."""

    async def _purge() -> None:
        async with test_session_factory() as session:
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
async def cleanup_database_jobs() -> AsyncGenerator[None, None]:
    """Track and purge any JobOffer records created during each test execution."""
    async with test_session_factory() as session:
        result = await session.execute(select(JobOffer.id))
        pre_test_ids = set(result.scalars().all())

    try:
        yield
    finally:
        async with test_session_factory() as session:
            result = await session.execute(select(JobOffer.id))
            post_test_ids = set(result.scalars().all())
            new_ids = post_test_ids - pre_test_ids
            if new_ids:
                await session.execute(delete(JobOffer).where(JobOffer.id.in_(new_ids)))
                await session.commit()


@pytest.fixture
async def async_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client bound to FastAPI application."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
