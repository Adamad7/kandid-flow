"""Tests for settings retrieval, updates, and connection testing endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.config import settings
from app.services.llm_client import LLMClient


@pytest.mark.asyncio
async def test_get_settings_includes_api_key_indicators(async_client: httpx.AsyncClient):
    """Verify GET /api/v1/settings returns has_gemini_api_key and has_openai_api_key."""
    res = await async_client.get("/api/v1/settings")
    assert res.status_code == 200
    data = res.json()

    assert "has_gemini_api_key" in data
    assert "has_openai_api_key" in data
    assert isinstance(data["has_gemini_api_key"], bool)
    assert isinstance(data["has_openai_api_key"], bool)
    assert "id" in data
    assert data["id"] == 1


@pytest.mark.asyncio
async def test_test_ollama_success(async_client: httpx.AsyncClient):
    """Verify POST /api/v1/settings/test-ollama returns success when model exists."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"models": [{"name": "qwen2.5:14b"}, {"name": "llama3.2:3b"}]}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        res = await async_client.post(
            "/api/v1/settings/test-ollama",
            json={
                "ollama_base_url": "http://mock-ollama:11434",
                "ollama_model": "qwen2.5:14b",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "qwen2.5:14b" in data["available_models"]
        assert data["latency_ms"] is not None
        assert "gotowy do użycia" in data["message"]


@pytest.mark.asyncio
async def test_test_ollama_model_not_found(async_client: httpx.AsyncClient):
    """Verify POST /api/v1/settings/test-ollama returns failure when model is missing."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"models": [{"name": "llama3.2:3b"}]}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        res = await async_client.post(
            "/api/v1/settings/test-ollama",
            json={
                "ollama_base_url": "http://mock-ollama:11434",
                "ollama_model": "qwen2.5:14b",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert "llama3.2:3b" in data["available_models"]
        assert "nie został znaleziony" in data["message"]


@pytest.mark.asyncio
async def test_test_ollama_connection_error(async_client: httpx.AsyncClient):
    """Verify POST /api/v1/settings/test-ollama handles connection errors gracefully."""
    with patch(
        "httpx.AsyncClient.get",
        side_effect=httpx.ConnectError("Connection refused"),
    ):
        res = await async_client.post(
            "/api/v1/settings/test-ollama",
            json={
                "ollama_base_url": "http://unreachable-host:11434",
                "ollama_model": "qwen2.5:14b",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert "Nie udało się połączyć z serwerem Ollama" in data["message"]


@pytest.mark.asyncio
async def test_test_cloud_missing_key(async_client: httpx.AsyncClient):
    """Verify POST /api/v1/settings/test-cloud returns failure if API key is not configured."""
    with patch.object(settings, "GEMINI_API_KEY", None):
        res = await async_client.post(
            "/api/v1/settings/test-cloud",
            json={"provider": "gemini", "model": "gemini-3.8-flash"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert "GEMINI_API_KEY" in data["message"]


@pytest.mark.asyncio
async def test_test_cloud_success(async_client: httpx.AsyncClient):
    """Verify POST /api/v1/settings/test-cloud successfully tests litellm connection."""
    mock_choice = MagicMock()
    mock_choice.message.content = "ok"
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]

    with patch.object(settings, "GEMINI_API_KEY", "AIzaSyTestValidFakeKey1234567890"):
        with patch("litellm.acompletion", new_callable=AsyncMock) as mock_acompletion:
            mock_acompletion.return_value = mock_completion

            res = await async_client.post(
                "/api/v1/settings/test-cloud",
                json={"provider": "gemini", "model": "gemini-3.8-flash"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["latency_ms"] is not None
            assert "Pomyślnie połączono" in data["message"]


@pytest.mark.asyncio
async def test_test_cloud_error(async_client: httpx.AsyncClient):
    """Verify POST /api/v1/settings/test-cloud handles provider API exceptions."""
    with patch.object(settings, "OPENAI_API_KEY", "sk-proj-TestValidFakeKey1234567890"):
        with patch(
            "litellm.acompletion",
            side_effect=RuntimeError("Quota exceeded or invalid credentials"),
        ):
            res = await async_client.post(
                "/api/v1/settings/test-cloud",
                json={"provider": "openai", "model": "gpt-4o-mini"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is False
            assert "Quota exceeded" in data["message"]


@pytest.mark.asyncio
async def test_llm_client_fallback_diagnostic_error():
    """Verify LLMClient returns detailed diagnostic error when both local and cloud fail."""
    client = LLMClient()

    with patch.object(settings, "TEST_AI_PROVIDER", "mock"):
        with patch.object(
            client,
            "_resolve_runtime_config",
            new_callable=AsyncMock,
            return_value={
                "auto_parse_mode": "auto_ollama_fallback_api",
                "ollama_base_url": "http://mock-ollama:11434",
                "ollama_model": "qwen2.5:14b",
                "api_provider": "gemini",
                "api_model": "gemini-3.8-flash",
            },
        ):
            with patch.object(client, "gemini_api_key", "AIzaSyValidGeminiKey123456"):
                with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Local down")):
                    with patch("litellm.acompletion", side_effect=RuntimeError("Cloud down")):
                        with pytest.raises(RuntimeError) as exc_info:
                            await client.generate_json(
                                system_prompt="Test system",
                                user_prompt="Test user",
                                fallback_data=None,
                            )

                        err_msg = str(exc_info.value)
                        assert "Niepowodzenie przetwarzania przez model AI" in err_msg
                        assert "Silnik lokalny" in err_msg
                        assert "Silnik chmurowy" in err_msg


@pytest.mark.asyncio
async def test_get_settings_includes_tasks_config(async_client: httpx.AsyncClient):
    """Verify GET /api/v1/settings returns tasks_config with all 4 tasks initialized."""
    res = await async_client.get("/api/v1/settings")
    assert res.status_code == 200
    data = res.json()

    assert "tasks_config" in data
    tasks = data["tasks_config"]
    assert "job_parsing" in tasks
    assert "cv_generation" in tasks
    assert "cv_refinement" in tasks
    assert "knowledge_base_parsing" in tasks

    jp = tasks["job_parsing"]
    assert jp["routing_mode"] in ("fallback", "local", "cloud")
    assert "local_model" in jp
    assert "cloud_model" in jp
    assert "model" in jp["local_model"]
    assert "model" in jp["cloud_model"]
    assert "local_test_passed" in jp
    assert "cloud_test_passed" in jp


@pytest.mark.asyncio
async def test_update_settings_tasks_config(async_client: httpx.AsyncClient):
    """Verify updating per-task AI settings via PUT/PATCH /api/v1/settings."""
    get_res = await async_client.get("/api/v1/settings")
    assert get_res.status_code == 200
    current_settings = get_res.json()
    tasks_cfg = current_settings.get("tasks_config", {})

    # Modify cv_generation task
    tasks_cfg["cv_generation"]["routing_mode"] = "cloud"
    tasks_cfg["cv_generation"]["cloud_model"]["model"] = "gemini-2.5-pro"
    tasks_cfg["cv_generation"]["cloud_model"]["enable_thinking"] = True

    patch_res = await async_client.patch(
        "/api/v1/settings",
        json={"tasks_config": tasks_cfg},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["tasks_config"]["cv_generation"]["routing_mode"] == "cloud"
    assert updated["tasks_config"]["cv_generation"]["cloud_model"]["model"] == "gemini-2.5-pro"
    assert updated["tasks_config"]["cv_generation"]["cloud_model"]["enable_thinking"] is True


@pytest.mark.asyncio
async def test_test_ollama_updates_task_status(async_client: httpx.AsyncClient):
    """Verify POST /api/v1/settings/test-ollama updates task local test status."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"models": [{"name": "qwen2.5:14b"}]}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        res = await async_client.post(
            "/api/v1/settings/test-ollama",
            json={
                "ollama_base_url": "http://mock-ollama:11434",
                "ollama_model": "qwen2.5:14b",
                "task": "job_parsing",
            },
        )
        assert res.status_code == 200
        assert res.json()["success"] is True

    # Verify settings reflection
    get_res = await async_client.get("/api/v1/settings")
    assert get_res.status_code == 200
    settings_data = get_res.json()
    jp = settings_data["tasks_config"]["job_parsing"]
    assert jp["local_test_passed"] is True
    assert jp["local_test_message"] is not None


@pytest.mark.asyncio
async def test_test_cloud_updates_task_status(async_client: httpx.AsyncClient):
    """Verify POST /api/v1/settings/test-cloud updates task cloud test status."""
    mock_choice = MagicMock()
    mock_choice.message.content = "ok"
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]

    with patch.object(settings, "GEMINI_API_KEY", "AIzaSyTestValidFakeKey1234567890"):
        with patch("litellm.acompletion", new_callable=AsyncMock) as mock_acompletion:
            mock_acompletion.return_value = mock_completion

            res = await async_client.post(
                "/api/v1/settings/test-cloud",
                json={
                    "provider": "gemini",
                    "model": "gemini-3.8-flash",
                    "enable_thinking": True,
                    "reasoning_effort": "high",
                    "task": "cv_refinement",
                },
            )
            assert res.status_code == 200
            assert res.json()["success"] is True

    # Verify settings reflection
    get_res = await async_client.get("/api/v1/settings")
    assert get_res.status_code == 200
    settings_data = get_res.json()
    cr = settings_data["tasks_config"]["cv_refinement"]
    assert cr["cloud_test_passed"] is True
    assert cr["cloud_test_message"] is not None


@pytest.mark.asyncio
async def test_llm_client_resolves_task_config():
    """Verify LLMClient._resolve_runtime_config correctly extracts task configuration."""
    client = LLMClient()
    cfg = await client._resolve_runtime_config(task="cv_generation")

    assert "auto_parse_mode" in cfg
    assert "ollama_model" in cfg
    assert "api_model" in cfg
    assert "local_context_window" in cfg
    assert "cloud_context_window" in cfg
