"""API v1 routers and endpoints registration."""

from fastapi import APIRouter

from app.api.v1 import candidate, cv, events, inbox, jobs, presets, settings

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(inbox.router)
api_v1_router.include_router(cv.router)
api_v1_router.include_router(jobs.router)
api_v1_router.include_router(events.router)
api_v1_router.include_router(candidate.router)
api_v1_router.include_router(presets.router)
api_v1_router.include_router(settings.router)

__all__ = ["api_v1_router"]
