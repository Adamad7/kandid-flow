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
        provider: str | None = None,
        model: str | None = None,
        enable_thinking: bool = False,
        timeout: float | None = None,
        api_key: str | None = None,
    ) -> Any:
        """Attempt local Ollama or specified provider; fall back to cloud API or fallback data."""
        custom_key = api_key.strip() if (api_key and api_key.strip()) else None

        # Resolve provider for "local" or "api"
        effective_provider = provider
        if provider == "api":
            if custom_key:
                if custom_key.startswith("AIza"):
                    effective_provider = "gemini"
                elif custom_key.startswith("sk-"):
                    effective_provider = "openai"
                else:
                    effective_provider = self.api_provider or "gemini"
            else:
                if self.api_provider in ("gemini", "openai"):
                    effective_provider = self.api_provider
                elif bool(self.gemini_api_key and len(self.gemini_api_key) > 10):
                    effective_provider = "gemini"
                elif bool(self.openai_api_key and len(self.openai_api_key) > 10):
                    effective_provider = "openai"
                else:
                    effective_provider = "gemini"

        # 1. Attempt local Ollama
        should_use_ollama = effective_provider in ("local", "ollama") or (
            effective_provider is None
            and settings.AUTO_PARSE_MODE in ("auto_ollama_fallback_api", "auto_ollama_only")
        )
        if should_use_ollama:
            ollama_target_model = model or self.ollama_model
            ollama_timeout = (
                timeout if timeout is not None else (180.0 if enable_thinking else 90.0)
            )
            try:
                async with httpx.AsyncClient(timeout=ollama_timeout) as client:
                    resp = await client.post(
                        f"{self.ollama_base_url}/api/generate",
                        json={
                            "model": ollama_target_model,
                            "system": system_prompt,
                            "prompt": user_prompt,
                            "stream": False,
                            "format": "json",
                            "think": enable_thinking,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_response = data.get("response", "").strip()
                        # Fallback to thinking tokens if reasoning model generated JSON in think
                        if not raw_response:
                            raw_response = data.get("thinking", "").strip()
                        if raw_response:
                            return _extract_json_data(raw_response)
                    else:
                        logger.warning(
                            "Local Ollama returned HTTP %s: %s", resp.status_code, resp.text
                        )
            except Exception as err:
                logger.warning("Local Ollama request failed (%s): %s", ollama_target_model, err)

        # 2. Cloud Fallback if configured (only with valid non-placeholder keys)
        gemini_key = (
            custom_key if (effective_provider == "gemini" and custom_key) else self.gemini_api_key
        )
        openai_key = (
            custom_key if (effective_provider == "openai" and custom_key) else self.openai_api_key
        )

        has_valid_gemini = bool(
            gemini_key and not gemini_key.startswith("your_") and len(gemini_key) > 10
        )
        has_valid_openai = bool(
            openai_key and not openai_key.startswith("your_") and len(openai_key) > 10
        )

        cloud_timeout = timeout if timeout is not None else (120.0 if enable_thinking else 30.0)

        should_use_gemini = effective_provider == "gemini" or (
            effective_provider is None
            and settings.AUTO_PARSE_MODE in ("auto_ollama_fallback_api", "auto_api_only")
            and self.api_provider == "gemini"
        )
        should_use_openai = effective_provider == "openai" or (
            effective_provider is None
            and settings.AUTO_PARSE_MODE in ("auto_ollama_fallback_api", "auto_api_only")
            and self.api_provider == "openai"
        )

        if should_use_gemini:
            if not has_valid_gemini:
                logger.warning("Cloud Gemini requested but valid GEMINI_API_KEY is not configured")
            else:
                try:
                    import litellm

                    target_api_model = model or self.api_model
                    litellm_model = (
                        target_api_model
                        if target_api_model.startswith("gemini/")
                        else f"gemini/{target_api_model}"
                    )
                    response = await litellm.acompletion(
                        model=litellm_model,
                        api_key=gemini_key,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        timeout=cloud_timeout,
                    )
                    content = response.choices[0].message.content
                    return _extract_json_data(content)
                except Exception as err:
                    logger.warning("Cloud Gemini LLM API call failed: %s", err)

        elif should_use_openai:
            if not has_valid_openai:
                logger.warning("Cloud OpenAI requested but valid OPENAI_API_KEY is not configured")
            else:
                try:
                    import litellm

                    target_api_model = model or self.api_model
                    extra_kwargs: dict[str, Any] = {}
                    if enable_thinking and any(
                        m in target_api_model.lower() for m in ("o1", "o3", "reasoning")
                    ):
                        extra_kwargs["reasoning_effort"] = "medium"

                    response = await litellm.acompletion(
                        model=target_api_model,
                        api_key=openai_key,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        timeout=cloud_timeout,
                        **extra_kwargs,
                    )
                    content = response.choices[0].message.content
                    return _extract_json_data(content)
                except Exception as err:
                    logger.warning("Cloud OpenAI LLM API call failed: %s", err)

        # 3. Return fallback data if provided, or raise error if strict AI parsing was requested
        if fallback_data is not None:
            logger.info("Using baseline fallback schema")
            return fallback_data

        target_name = model or self.ollama_model
        raise RuntimeError(
            f"Nie udało się połączyć z modelem AI ({target_name}). "
            f"Upewnij się, że lokalna Ollama działa poprawnie ('ollama run {target_name}') "
            "lub uzupełnij klucz GEMINI_API_KEY / OPENAI_API_KEY w pliku .env."
        )


llm_client = LLMClient()
