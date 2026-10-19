"""Real-time Server-Sent Events (SSE) streaming API endpoints."""

import asyncio
import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.realtime import RealtimeEvent, RealtimeEventPayload
from app.services.events_broadcaster import events_broadcaster

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/realtime", tags=["Realtime"])


@router.get(
    "/stream",
    response_class=StreamingResponse,
    summary="Real-time Server-Sent Events (SSE) stream",
)
async def realtime_stream() -> StreamingResponse:
    """Stream application real-time events to connected clients via SSE."""
    queue = events_broadcaster.subscribe()

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Emit initial connection message
            initial_event = RealtimeEvent(
                event="ping",
                payload=RealtimeEventPayload(message="connected"),
            )
            yield f"data: {initial_event.model_dump_json()}\n\n"

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {event.model_dump_json()}\n\n"
                except TimeoutError:
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            events_broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
