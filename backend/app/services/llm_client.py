"""Resilient LLM orchestration client with local Ollama and Cloud API fallback."""

import json
import logging
import re
from datetime import UTC
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _compute_bracket_stack(s: str) -> list[str]:
    """Track unclosed opening brackets ({ and [) while ignoring string contents."""
    stack: list[str] = []
    in_str = False
    esc = False
    for char in s:
        if in_str:
            if esc:
                esc = False
            elif char == "\\":
                esc = True
            elif char == '"':
                in_str = False
        else:
            if char == '"':
                in_str = True
            elif char in ("{", "["):
                stack.append(char)
            elif char in ("}", "]"):
                if stack:
                    if (char == "}" and stack[-1] == "{") or (char == "]" and stack[-1] == "["):
                        stack.pop()
    return stack


def repair_truncated_json(text: str) -> str:
    """Attempt to repair incomplete or truncated JSON string from LLM output."""
    if not text:
        return text

    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    # Strip any leading text before first '{' or '['
    start_brace = cleaned.find("{")
    start_bracket = cleaned.find("[")
    if start_brace != -1 and start_bracket != -1:
        start_idx = min(start_brace, start_bracket)
    elif start_brace != -1:
        start_idx = start_brace
    elif start_bracket != -1:
        start_idx = start_bracket
    else:
        start_idx = -1

    if start_idx > 0:
        cleaned = cleaned[start_idx:]

    # 1. Close open string if odd unescaped quote count
    in_str = False
    esc = False
    for char in cleaned:
        if in_str:
            if esc:
                esc = False
            elif char == "\\":
                esc = True
            elif char == '"':
                in_str = False
        else:
            if char == '"':
                in_str = True

    if in_str:
        if esc:
            cleaned = cleaned[:-1]
        cleaned = cleaned + '"'

    # Compute bracket stack
    stack = _compute_bracket_stack(cleaned)

    # 2. Remove hanging key or comma
    # If top of stack is '{', a trailing key without value, or key with colon but no value,
    # is invalid in JSON.
    if stack and stack[-1] == "{":
        # Key with colon and incomplete value or whitespace (e.g. , "key": or "key":)
        cleaned = re.sub(r",\s*\"[^\"]*\"\s*:\s*$", "", cleaned)
        cleaned = re.sub(r"(?<=\{)\s*\"[^\"]*\"\s*:\s*$", "", cleaned)
        # Dangling key without colon inside an object (e.g. , "key" or "key")
        cleaned = re.sub(r",\s*\"[^\"]*\"\s*$", "", cleaned)
        cleaned = re.sub(r"(?<=\{)\s*\"[^\"]*\"\s*$", "", cleaned)

    # Strip any trailing comma or dangling colon
    cleaned = re.sub(r",\s*$", "", cleaned)
    cleaned = re.sub(r":\s*$", "", cleaned)
    cleaned = re.sub(r",\s*$", "", cleaned)

    # Recompute stack after removals
    stack = _compute_bracket_stack(cleaned)

    # 3. Close open brackets in reverse order
    closing_map = {"{": "}", "[": "]"}
    for open_bracket in reversed(stack):
        cleaned += closing_map[open_bracket]

    return cleaned


def _extract_json_data(text: str) -> Any:
    """Safely extract and parse JSON object or array from LLM output, with truncation repair."""
    if not text:
        raise ValueError("Pusta odpowiedź z modelu")
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    try:
        repaired = repair_truncated_json(cleaned)
        return json.loads(repaired)
    except Exception as e:
        logger.warning("Truncated JSON repair failed: %s (input: %.200s)", e, cleaned)
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

    async def _resolve_runtime_config(self) -> dict[str, str]:
        """Resolve current runtime settings from database or fallback to environment."""
        cfg = {
            "auto_parse_mode": settings.AUTO_PARSE_MODE,
            "ollama_base_url": settings.OLLAMA_BASE_URL.rstrip("/"),
            "ollama_model": settings.OLLAMA_MODEL,
            "api_provider": settings.API_PROVIDER,
            "api_model": settings.API_MODEL,
        }
        try:
            from sqlalchemy import select

            from app.database import async_session_factory
            from app.models.settings import AppSettings

            async with async_session_factory() as session:
                stmt = select(AppSettings).where(AppSettings.id == 1)
                res = await session.execute(stmt)
                db_setting = res.scalar_one_or_none()
                if db_setting:
                    if db_setting.auto_parse_mode:
                        cfg["auto_parse_mode"] = db_setting.auto_parse_mode
                    if db_setting.ollama_base_url:
                        cfg["ollama_base_url"] = db_setting.ollama_base_url.rstrip("/")
                    if db_setting.ollama_model:
                        cfg["ollama_model"] = db_setting.ollama_model
                    if db_setting.api_provider:
                        cfg["api_provider"] = db_setting.api_provider
                    if db_setting.api_model:
                        cfg["api_model"] = db_setting.api_model
        except Exception as e:
            logger.debug("Using environment LLM settings (DB settings unavailable: %s)", e)
        return cfg

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
        context_window: int | None = None,
        max_tokens: int | None = None,
    ) -> Any:
        """Attempt local Ollama or specified provider; fall back to cloud API or fallback data."""
        runtime_cfg = await self._resolve_runtime_config()
        effective_auto_parse_mode = runtime_cfg["auto_parse_mode"]
        effective_ollama_base_url = runtime_cfg["ollama_base_url"]
        effective_ollama_model = runtime_cfg["ollama_model"]
        effective_api_provider = runtime_cfg["api_provider"]
        effective_api_model = runtime_cfg["api_model"]

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
                    effective_provider = effective_api_provider or "gemini"
            else:
                if effective_api_provider in ("gemini", "openai"):
                    effective_provider = effective_api_provider
                elif bool(self.gemini_api_key and len(self.gemini_api_key) > 10):
                    effective_provider = "gemini"
                elif bool(self.openai_api_key and len(self.openai_api_key) > 10):
                    effective_provider = "openai"
                else:
                    effective_provider = "gemini"

        # 1. Attempt local Ollama
        should_use_ollama = effective_provider in ("local", "ollama") or (
            effective_provider is None
            and effective_auto_parse_mode in ("auto_ollama_fallback_api", "auto_ollama_only")
        )
        local_error_detail: str | None = None
        if should_use_ollama:
            ollama_target_model = model or effective_ollama_model
            is_reasoning_model = any(
                m in ollama_target_model.lower() for m in ("deepseek-r1", "r1", "qwq", "reasoning")
            )
            ollama_think = bool(enable_thinking and is_reasoning_model)
            ollama_timeout = timeout if timeout is not None else (300.0 if ollama_think else 120.0)
            eff_context_window = context_window or 32768
            eff_max_tokens = max_tokens or min(eff_context_window, 16384)
            try:
                async with httpx.AsyncClient(timeout=ollama_timeout) as client:
                    resp = await client.post(
                        f"{effective_ollama_base_url}/api/generate",
                        json={
                            "model": ollama_target_model,
                            "system": system_prompt,
                            "prompt": user_prompt,
                            "stream": False,
                            "format": "json",
                            "think": ollama_think,
                            "options": {
                                "num_ctx": eff_context_window,
                                "num_predict": eff_max_tokens,
                                "temperature": 0.2,
                                "repeat_penalty": 1.15,
                            },
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
                            local_error_detail = "Model lokalny zwrócił pustą odpowiedź"
                    else:
                        local_error_detail = (
                            f"Serwer Ollama zwrócił kod HTTP {resp.status_code}: {resp.text}"
                        )
                        logger.warning(
                            "Local Ollama returned HTTP %s: %s", resp.status_code, resp.text
                        )
            except httpx.TimeoutException:
                local_error_detail = (
                    f"Przekroczono limit czasu oczekiwania na odpowiedź modelu lokalnego "
                    f"({int(ollama_timeout)}s). Spróbuj wyłączyć 'Tryb namysłu' "
                    "lub użyć szybszego modelu."
                )
                logger.warning(
                    "Local Ollama request timed out (%s, %ss)",
                    ollama_target_model,
                    ollama_timeout,
                )
            except (json.JSONDecodeError, ValueError) as json_err:
                local_error_detail = (
                    "Model lokalny wygenerował niepełny lub uszkodzony JSON "
                    f"(prawdopodobne ucięcie tokenów): {json_err}"
                )
                logger.warning(
                    "Local Ollama JSON extraction failed (%s): %s",
                    ollama_target_model,
                    json_err,
                )
            except httpx.ConnectError:
                local_error_detail = (
                    f"Nie udało się nawiązać połączenia z serwerem Ollama pod adresem "
                    f"{effective_ollama_base_url}. Upewnij się, że lokalna usługa Ollama "
                    "jest uruchomiona na maszynie hosta ('ollama serve')."
                )
                logger.warning("Local Ollama connection failed (%s)", effective_ollama_base_url)
            except Exception as err:
                local_error_detail = f"Błąd wykonania zapytania do Ollama: {err}"
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
            and effective_auto_parse_mode in ("auto_ollama_fallback_api", "auto_api_only")
            and effective_api_provider == "gemini"
        )
        should_use_openai = effective_provider == "openai" or (
            effective_provider is None
            and effective_auto_parse_mode in ("auto_ollama_fallback_api", "auto_api_only")
            and effective_api_provider == "openai"
        )

        if should_use_gemini:
            if not has_valid_gemini:
                logger.warning("Cloud Gemini requested but valid GEMINI_API_KEY is not configured")
            else:
                try:
                    import litellm

                    target_api_model = model or effective_api_model
                    litellm_model = (
                        target_api_model
                        if target_api_model.startswith("gemini/")
                        else f"gemini/{target_api_model}"
                    )
                    eff_cloud_max_tokens = max_tokens or 16384
                    response = await litellm.acompletion(
                        model=litellm_model,
                        api_key=gemini_key,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        max_tokens=eff_cloud_max_tokens,
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

                    target_api_model = model or effective_api_model
                    extra_kwargs: dict[str, Any] = {}
                    if enable_thinking and any(
                        m in target_api_model.lower() for m in ("o1", "o3", "reasoning")
                    ):
                        extra_kwargs["reasoning_effort"] = "medium"

                    eff_cloud_max_tokens = max_tokens or 16384
                    response = await litellm.acompletion(
                        model=target_api_model,
                        api_key=openai_key,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        max_tokens=eff_cloud_max_tokens,
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

        target_name = model or effective_ollama_model
        if local_error_detail:
            raise RuntimeError(
                f"Błąd modelu AI ({target_name}): {local_error_detail}. "
                f"Upewnij się, że model jest zainstalowany ('ollama run {target_name}') "
                "lub skonfiguruj klucz API w chmurze (GEMINI_API_KEY / OPENAI_API_KEY) "
                "w pliku .env."
            )

        raise RuntimeError(
            f"Nie udało się połączyć z modelem AI ({target_name}). "
            f"Upewnij się, że lokalna Ollama działa poprawnie ('ollama run {target_name}') "
            "lub uzupełnij klucz GEMINI_API_KEY / OPENAI_API_KEY w pliku .env."
        )

    async def generate_follow_up(
        self,
        role_title: str,
        company_name: str,
        applied_at_str: str | None,
        tone: str = "polite_inquiry",
        platform: str = "linkedin",
        custom_notes: str | None = None,
    ) -> dict[str, Any]:
        """Generate a tailored recruitment follow-up message using LLM with fallback template."""
        from datetime import datetime

        tones_desc = {
            "polite_inquiry": "uprzejmy, wyważony i profesjonalny",
            "enthusiastic": "entuzjastyczny, zmotywowany i podkreślający dopasowanie do roli",
            "short_checkin": "bardzo zwięzły, konkretny check-in (2-3 zdania)",
        }
        tone_instruction = tones_desc.get(tone, "uprzejmy i profesjonalny")

        system_prompt = (
            "Jesteś profesjonalnym asystentem kariery IT w aplikacji KandidFlow. "
            "Twoim celem jest przygotowanie naturalnie brzmiącej wiadomości follow-up "
            "(przypomnienia o wysłanej aplikacji) do rekrutera lub hiring managera. "
            "Wiadomość musi brzmieć autentycznie, szanować czas odbiorcy i nie być nachalna.\n\n"
            "Zwróć odpowiedź WYŁĄCZNIE jako poprawny obiekt JSON o schemacie:\n"
            "{\n"
            '  "subject": "Temat wiadomości (dla e-mail; null jeśli platforma to linkedin)",\n'
            '  "content": "Pełna treść wiadomości gotowa do wysłania"\n'
            "}"
        )

        contact_channel = "Wiadomość LinkedIn" if platform == "linkedin" else "Wiadomość e-mail"
        user_prompt = (
            f"Stanowisko: {role_title}\n"
            f"Firma: {company_name}\n"
            f"Data aplikacji: {applied_at_str or 'kilka dni temu'}\n"
            f"Platforma kontaktu: {contact_channel}\n"
            f"Styl/Ton: {tone_instruction}\n"
        )
        if custom_notes:
            user_prompt += f"Dodatkowe wskazówki od kandydata: {custom_notes}\n"

        # Fallback template in case LLM is unavailable
        fallback_subject = (
            f"Pytanie o status aplikacji – {role_title}" if platform == "email" else None
        )
        if platform == "linkedin":
            if tone == "short_checkin":
                fallback_content = (
                    f"Dzień dobry, nawiązując krótko do mojej aplikacji na stanowisko {role_title} "
                    f"w firmie {company_name} – chciałem zapytać, czy rekrutacja jest w toku. "
                    "Pozdrawiam serdecznie!"
                )
            else:
                fallback_content = (
                    f"Dzień dobry! Zwracam się z uprzejmym zapytaniem o status mojej aplikacji "
                    f"na stanowisko {role_title} w firmie {company_name}. Nadal jestem bardzo "
                    "zainteresowany współpracą i z chęcią odpowiem na wszelkie dodatkowe pytania. "
                    "Pozdrawiam serdecznie!"
                )
        else:
            fallback_content = (
                f"Szanowni Państwo,\n\n"
                f"Zwracam się z uprzejmym pytaniem o status procesu rekrutacyjnego na stanowisko "
                f"{role_title} w firmie {company_name}, na które aplikowałem "
                f"{applied_at_str or 'w ostatnim czasie'}.\n\n"
                "Nadal jestem bardzo zainteresowany dołączeniem do Państwa zespołu i realizacją "
                "projektów w Państwa strukturach. Będę wdzięczny za krótką informację o "
                "kolejnych krokach w procesie rekrutacji.\n\n"
                "Z poważaniem,\n[Twoje Imię i Nazwisko]"
            )

        fallback_data = {
            "subject": fallback_subject,
            "content": fallback_content,
        }

        try:
            res = await self.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                fallback_data=fallback_data,
                timeout=45.0,
            )
            return {
                "subject": res.get("subject") if platform == "email" else None,
                "content": res.get("content") or fallback_content,
                "generated_at": datetime.now(UTC),
            }
        except Exception:
            return {
                "subject": fallback_subject,
                "content": fallback_content,
                "generated_at": datetime.now(UTC),
            }


llm_client = LLMClient()
