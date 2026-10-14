"""KandidFlow FastAPI Application Entrypoint."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.v1 import api_v1_router
from app.config import settings
from app.database import async_session_factory
from app.models.settings import AppSettings
from app.services.job_parser import job_parser_worker

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events (startup and shutdown)."""
    # Ensure default app settings exist in database
    try:
        async with async_session_factory() as session:
            stmt = select(AppSettings).where(AppSettings.id == 1)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if not existing:
                default_settings = AppSettings(
                    id=1,
                    auto_parse_mode=settings.AUTO_PARSE_MODE,
                    ollama_base_url=settings.OLLAMA_BASE_URL,
                    ollama_model=settings.OLLAMA_MODEL,
                    api_provider=settings.API_PROVIDER,
                    api_model=settings.API_MODEL,
                )
                session.add(default_settings)
                await session.commit()
                logger.info("Initialized default app_settings in database")
    except Exception as exc:
        logger.warning("Could not initialize default app_settings on startup: %s", exc)

    # Start background job parsing worker
    job_parser_worker.start()

    yield

    # Gracefully stop background job parsing worker
    await job_parser_worker.stop()


app = FastAPI(
    title="KandidFlow API",
    description="Automated IT recruitment workflow backend and CV compiler.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Middleware configuration allowing Vite dev server and Chrome extension origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^chrome-extension://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(api_v1_router)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Basic healthcheck endpoint for orchestration monitoring."""
    return {"status": "ok", "service": "kandid-flow-backend"}
