"""In-memory event broadcaster for real-time Server-Sent Events (SSE)."""

import asyncio
import logging

from app.schemas.realtime import (
    RealtimeEvent,
    RealtimeEventPayload,
    RealtimeEventType,
)

logger = logging.getLogger(__name__)


class EventBroadcaster:
    """Asynchronous in-memory publish-subscribe broadcaster."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[RealtimeEvent]] = set()

    def subscribe(self) -> asyncio.Queue[RealtimeEvent]:
        """Register a new subscriber and return an asyncio Queue for receiving events."""
        queue: asyncio.Queue[RealtimeEvent] = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        logger.debug(
            "Registered SSE subscriber queue. Total active subscribers: %d",
            len(self._subscribers),
        )
        return queue

    def unsubscribe(self, queue: asyncio.Queue[RealtimeEvent]) -> None:
        """Unregister an existing subscriber queue."""
        self._subscribers.discard(queue)
        logger.debug(
            "Unregistered SSE subscriber queue. Remaining active subscribers: %d",
            len(self._subscribers),
        )

    async def broadcast(
        self,
        event: RealtimeEventType,
        payload: RealtimeEventPayload | None = None,
    ) -> None:
        """Broadcast an event to all connected subscriber queues."""
        realtime_payload = payload if payload is not None else RealtimeEventPayload()
        event_obj = RealtimeEvent(event=event, payload=realtime_payload)

        for queue in list(self._subscribers):
            try:
                queue.put_nowait(event_obj)
            except asyncio.QueueFull:
                logger.warning(
                    "Subscriber queue full; dropping real-time event %s",
                    event,
                )
            except Exception as exc:
                logger.warning("Error pushing event to subscriber queue: %s", exc)

    def broadcast_sync(
        self,
        event: RealtimeEventType,
        payload: RealtimeEventPayload | None = None,
    ) -> None:
        """Synchronously schedule broadcast if an asyncio event loop is currently running."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(event, payload))
        except RuntimeError:
            logger.debug(
                "No running event loop available for broadcast_sync (%s)",
                event,
            )


# Global singleton broadcaster instance
events_broadcaster = EventBroadcaster()
