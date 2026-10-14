"""Resilient LLM orchestration client with local Ollama and Cloud API fallback."""

import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Orchestrates structured LLM invocations with automatic fallback."""

    def __init__(self) -> None:
        self.ollama_base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.ollama_model = settings.OLLAMA_MODEL
        self.api_provider = settings.API_PROVIDER
        self.api_model = settings.API_MODEL
        self.gemini_api_key = settings.GEMINI_API_KEY
        self.openai_api_key = settings.OPENAI_API_KEY

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        fallback_data: dict[str, Any] | list[dict[str, Any]],
    ) -> Any:
        """Attempt local Ollama first; on timeout/error fall back to cloud API or fallback data."""
        # 1. Attempt local Ollama
        if settings.AUTO_PARSE_MODE in ("auto_ollama_fallback_api", "auto_ollama_only"):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(
                        f"{self.ollama_base_url}/api/generate",
                        json={
                            "model": self.ollama_model,
                            "system": system_prompt,
                            "prompt": user_prompt,
                            "stream": False,
                            "format": "json",
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_response = data.get("response", "{}")
                        return json.loads(raw_response)
            except Exception as err:
                logger.info("Local Ollama request skipped/failed: %s", err)

        # 2. Cloud Fallback if configured
        if settings.AUTO_PARSE_MODE in ("auto_ollama_fallback_api", "auto_api_only"):
            if self.api_provider == "gemini" and self.gemini_api_key:
                try:
                    import litellm

                    response = await litellm.acompletion(
                        model=f"gemini/{self.api_model}",
                        api_key=self.gemini_api_key,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        timeout=15.0,
                    )
                    content = response.choices[0].message.content
                    return json.loads(content)
                except Exception as err:
                    logger.warning("Cloud LLM API call failed: %s", err)

        # 3. Return fallback data if provided, or raise error if strict AI parsing was requested
        if fallback_data is not None:
            logger.info("Using baseline fallback schema")
            return fallback_data

        raise RuntimeError(
            "Nie udało się połączyć z modelem AI. Uruchom lokalną Ollamę (np. 'ollama run qwen2.5:14b') "
            "lub uzupełnij klucz GEMINI_API_KEY / OPENAI_API_KEY w pliku .env."
        )


llm_client = LLMClient()
