"""Resilient LLM orchestration client with local Ollama and Cloud API fallback."""

import json
import logging
import re
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _extract_json_data(text: str) -> Any:
    """Safely extract and parse JSON object or array from LLM output."""
    if not text:
        raise ValueError("Pusta odpowiedź z modelu")
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise


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
        fallback_data: dict[str, Any] | list[dict[str, Any]] | None = None,
    ) -> Any:
        """Attempt local Ollama first; on timeout/error fall back to cloud API or fallback data."""
        # 1. Attempt local Ollama
        if settings.AUTO_PARSE_MODE in ("auto_ollama_fallback_api", "auto_ollama_only"):
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    resp = await client.post(
                        f"{self.ollama_base_url}/api/generate",
                        json={
                            "model": self.ollama_model,
                            "system": system_prompt,
                            "prompt": user_prompt,
                            "stream": False,
                            "format": "json",
                            "think": False,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_response = data.get("response", "").strip()
                        # Fallback to thinking tokens if reasoning model generated JSON in think block
                        if not raw_response:
                            raw_response = data.get("thinking", "").strip()
                        if raw_response:
                            return _extract_json_data(raw_response)
                    else:
                        logger.warning(
                            "Local Ollama returned HTTP %s: %s", resp.status_code, resp.text
                        )
            except Exception as err:
                logger.warning("Local Ollama request failed (%s): %s", self.ollama_model, err)

        # 2. Cloud Fallback if configured (only with valid non-placeholder keys)
        has_valid_gemini = (
            self.gemini_api_key
            and not self.gemini_api_key.startswith("your_")
            and len(self.gemini_api_key) > 10
        )
        has_valid_openai = (
            self.openai_api_key
            and not self.openai_api_key.startswith("your_")
            and len(self.openai_api_key) > 10
        )

        if settings.AUTO_PARSE_MODE in ("auto_ollama_fallback_api", "auto_api_only"):
            if self.api_provider == "gemini" and has_valid_gemini:
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
                        timeout=30.0,
                    )
                    content = response.choices[0].message.content
                    return _extract_json_data(content)
                except Exception as err:
                    logger.warning("Cloud Gemini LLM API call failed: %s", err)

            elif self.api_provider == "openai" and has_valid_openai:
                try:
                    import litellm

                    response = await litellm.acompletion(
                        model=self.api_model,
                        api_key=self.openai_api_key,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        timeout=30.0,
                    )
                    content = response.choices[0].message.content
                    return _extract_json_data(content)
                except Exception as err:
                    logger.warning("Cloud OpenAI LLM API call failed: %s", err)

        # 3. Return fallback data if provided, or raise error if strict AI parsing was requested
        if fallback_data is not None:
            logger.info("Using baseline fallback schema")
            return fallback_data

        raise RuntimeError(
            f"Nie udało się połączyć z modelem AI ({self.ollama_model}). "
            f"Upewnij się, że lokalna Ollama działa poprawnie ('ollama run {self.ollama_model}') "
            "lub uzupełnij klucz GEMINI_API_KEY / OPENAI_API_KEY w pliku .env."
        )


llm_client = LLMClient()
