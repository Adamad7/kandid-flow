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
