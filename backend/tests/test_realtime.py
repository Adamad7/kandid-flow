"""Tests for real-time Server-Sent Events (SSE) streaming and broadcaster."""

import asyncio
import json
from uuid import uuid4

import httpx
import pytest

from app.api.v1.realtime import realtime_stream
from app.config import settings
from app.main import app
from app.schemas.realtime import RealtimeEvent, RealtimeEventPayload
from app.services.events_broadcaster import events_broadcaster


@pytest.mark.asyncio
async def test_realtime_event_schema_serialization() -> None:
    """Verify RealtimeEvent serializes properly with default timestamp and payload."""
    event = RealtimeEvent(
        event="job_created",
        payload=RealtimeEventPayload(
            job_id=uuid4(),
            role_title="Backend Developer",
            company_name="Acme Corp",
            status="inbox",
            message="New offer",
        ),
    )
    raw_json = event.model_dump_json()
    parsed = json.loads(raw_json)

    assert parsed["event"] == "job_created"
    assert parsed["payload"]["role_title"] == "Backend Developer"
    assert parsed["payload"]["company_name"] == "Acme Corp"
    assert "timestamp" in parsed


@pytest.mark.asyncio
async def test_events_broadcaster_subscribe_and_broadcast() -> None:
    """Verify events_broadcaster distributes events to multiple subscribers and cleans up."""
    q1 = events_broadcaster.subscribe()
    q2 = events_broadcaster.subscribe()

    test_id = uuid4()
    await events_broadcaster.broadcast(
        "job_updated",
        RealtimeEventPayload(job_id=test_id, status="ready", message="Test parse"),
    )

    item1 = await asyncio.wait_for(q1.get(), timeout=1.0)
    item2 = await asyncio.wait_for(q2.get(), timeout=1.0)

    assert item1.event == "job_updated"
    assert item1.payload.job_id == test_id
    assert item1.payload.status == "ready"

    assert item2.event == "job_updated"
    assert item2.payload.job_id == test_id

    events_broadcaster.unsubscribe(q1)
    events_broadcaster.unsubscribe(q2)

    # After unsubscribing, broadcasting should not push to removed queues
    await events_broadcaster.broadcast("ping")
    assert q1.empty()
    assert q2.empty()


@pytest.mark.asyncio
async def test_events_broadcaster_broadcast_sync() -> None:
    """Verify broadcast_sync schedules a background task when an event loop is running."""
    queue = events_broadcaster.subscribe()
    try:
        events_broadcaster.broadcast_sync(
            "ping",
            RealtimeEventPayload(message="sync ping"),
        )
        await asyncio.sleep(0.05)

        item = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert item.event == "ping"
        assert item.payload.message == "sync ping"
    finally:
        events_broadcaster.unsubscribe(queue)


@pytest.mark.asyncio
async def test_realtime_stream_endpoint() -> None:
    """Verify realtime_stream response, initial connection event, and dynamic broadcast delivery."""
    response = await realtime_stream()
    assert response.status_code == 200
    assert response.media_type == "text/event-stream"
    assert response.headers.get("cache-control") == "no-cache"

    generator = response.body_iterator
    try:
        # 1. First event must be initial connection ping
        first_chunk = await anext(generator)
        assert first_chunk.startswith("data:")
        first_payload = json.loads(first_chunk[len("data:") :].strip())
        assert first_payload["event"] == "ping"
        assert first_payload["payload"]["message"] == "connected"

        # 2. Broadcast a new event and verify reception from generator
        test_job_id = uuid4()
        await events_broadcaster.broadcast(
            "job_created",
            RealtimeEventPayload(
                job_id=test_job_id,
                role_title="Lead Architect",
                company_name="Cloud Systems",
                status="inbox",
            ),
        )

        second_chunk = await anext(generator)
        assert second_chunk.startswith("data:")
        second_payload = json.loads(second_chunk[len("data:") :].strip())
        assert second_payload["event"] == "job_created"
        assert second_payload["payload"]["job_id"] == str(test_job_id)
        assert second_payload["payload"]["role_title"] == "Lead Architect"
    finally:
        await generator.aclose()


def test_realtime_route_registered_on_fastapi_app() -> None:
    """Verify GET /api/v1/realtime/stream is properly registered in OpenAPI schema."""
    openapi_paths = app.openapi().get("paths", {})
    assert "/api/v1/realtime/stream" in openapi_paths
    stream_spec = openapi_paths["/api/v1/realtime/stream"]
    assert "get" in stream_spec
    assert "Realtime" in stream_spec["get"].get("tags", [])


@pytest.mark.asyncio
async def test_inbox_ingestion_broadcasts_event(async_client: httpx.AsyncClient) -> None:
    """Verify that posting a job to /api/v1/inbox emits a 'job_created' realtime event."""
    queue = events_broadcaster.subscribe()
    try:
        unique_id = uuid4()
        url = f"https://justjoin.it/offers/realtime-test-{unique_id}"
        payload = {
            "source_url": url,
            "source_portal": "justjoin",
            "title": "Realtime SRE Engineer",
            "company": "FastStream Inc",
            "locations": ["Warszawa"],
            "description_text": "Observability and streaming experience.",
        }

        res = await async_client.post(
            "/api/v1/inbox",
            headers={"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"},
            json=payload,
        )
        assert res.status_code == 201

        # Check that the broadcaster queued a job_created event
        received = await asyncio.wait_for(queue.get(), timeout=2.0)
        assert received.event == "job_created"
        assert received.payload.role_title == "Realtime SRE Engineer"
        assert received.payload.company_name == "FastStream Inc"
    finally:
        events_broadcaster.unsubscribe(queue)


@pytest.mark.asyncio
async def test_jobs_patch_and_delete_broadcasts(async_client: httpx.AsyncClient) -> None:
    """Verify PATCH and DELETE on /api/v1/jobs/{id} broadcast 'job_updated' and 'job_deleted'."""
    # First ingest an offer
    unique_id = uuid4()
    url = f"https://justjoin.it/offers/realtime-job-{unique_id}"
    payload = {
        "source_url": url,
        "source_portal": "justjoin",
        "title": "Data Engineer",
        "company": "BigData Sp. z o.o.",
        "description_text": "PySpark and SQL.",
    }
    create_res = await async_client.post(
        "/api/v1/inbox",
        headers={"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"},
        json=payload,
    )
    assert create_res.status_code == 201
    job_id = create_res.json()["id"]

    queue = events_broadcaster.subscribe()
    try:
        # Patch job offer
        patch_res = await async_client.patch(
            f"/api/v1/jobs/{job_id}",
            json={"status": "applied", "notes": "Application sent"},
        )
        assert patch_res.status_code == 200

        updated_event = await asyncio.wait_for(queue.get(), timeout=2.0)
        assert updated_event.event == "job_updated"
        assert str(updated_event.payload.job_id) == str(job_id)
        assert updated_event.payload.status == "applied"

        # Delete job offer
        del_res = await async_client.delete(f"/api/v1/jobs/{job_id}")
        assert del_res.status_code == 204

        deleted_event = await asyncio.wait_for(queue.get(), timeout=2.0)
        assert deleted_event.event == "job_deleted"
        assert str(deleted_event.payload.job_id) == str(job_id)
    finally:
        events_broadcaster.unsubscribe(queue)


@pytest.mark.asyncio
async def test_recruitment_events_broadcasts(async_client: httpx.AsyncClient) -> None:
    """Verify recruitment events CRUD triggers corresponding realtime events."""
    # Create parent job offer
    unique_id = uuid4()
    url = f"https://justjoin.it/offers/realtime-event-job-{unique_id}"
    payload = {
        "source_url": url,
        "source_portal": "justjoin",
        "title": "Fullstack Engineer",
        "company": "EventCorp",
        "description_text": "React and FastAPI.",
    }
    create_job_res = await async_client.post(
        "/api/v1/inbox",
        headers={"Authorization": f"Bearer {settings.EXTENSION_API_TOKEN}"},
        json=payload,
    )
    job_id = create_job_res.json()["id"]

    queue = events_broadcaster.subscribe()
    try:
        # 1. Create recruitment event
        event_payload = {
            "job_offer_id": job_id,
            "event_type": "hr_screening",
            "title": "Initial HR call",
            "scheduled_at": "2026-11-01T10:00:00Z",
            "duration_minutes": 30,
        }
        create_res = await async_client.post("/api/v1/events", json=event_payload)
        assert create_res.status_code == 201
        event_id = create_res.json()["id"]

        ev1 = await asyncio.wait_for(queue.get(), timeout=2.0)
        assert ev1.event == "recruitment_event_created"
        assert str(ev1.payload.event_id) == str(event_id)

        # 2. Update recruitment event
        patch_res = await async_client.patch(
            f"/api/v1/events/{event_id}",
            json={"is_completed": True},
        )
        assert patch_res.status_code == 200

        ev2 = await asyncio.wait_for(queue.get(), timeout=2.0)
        assert ev2.event == "recruitment_event_updated"
        assert str(ev2.payload.event_id) == str(event_id)

        # 3. Delete recruitment event
        del_res = await async_client.delete(f"/api/v1/events/{event_id}")
        assert del_res.status_code == 204

        ev3 = await asyncio.wait_for(queue.get(), timeout=2.0)
        assert ev3.event == "recruitment_event_deleted"
        assert str(ev3.payload.event_id) == str(event_id)
    finally:
        events_broadcaster.unsubscribe(queue)
