"""Application runtime settings API endpoints."""

import logging
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db_session
from app.models.settings import AppSettings
from app.schemas.settings import (
    AppSettingsRead,
    AppSettingsUpdate,
    CloudTestRequest,
    OllamaTestRequest,
    SettingsConnectionTestResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])


def _is_valid_api_key(key: str | None) -> bool:
    """Validate whether an API key is non-empty, > 10 chars, and not a placeholder."""
    return bool(key and not key.startswith("your_") and len(key.strip()) > 10)


def _build_app_settings_read(app_setting: AppSettings) -> AppSettingsRead:
    """Construct AppSettingsRead schema with computed environment API key availability."""
    return AppSettingsRead(
        id=app_setting.id,
        auto_parse_mode=app_setting.auto_parse_mode,
        ollama_base_url=app_setting.ollama_base_url,
        ollama_model=app_setting.ollama_model,
        api_provider=app_setting.api_provider,
        api_model=app_setting.api_model,
        updated_at=app_setting.updated_at,
        has_gemini_api_key=_is_valid_api_key(settings.GEMINI_API_KEY),
        has_openai_api_key=_is_valid_api_key(settings.OPENAI_API_KEY),
    )


@router.get(
    "",
    response_model=AppSettingsRead,
    summary="Get application runtime settings",
)
async def get_settings(
    db: AsyncSession = Depends(get_db_session),
) -> AppSettingsRead:
    """Fetch current runtime settings (non-secret configuration)."""
    stmt = select(AppSettings).where(AppSettings.id == 1)
    result = await db.execute(stmt)
    app_setting = result.scalar_one_or_none()

    if not app_setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application settings not found",
        )

    return _build_app_settings_read(app_setting)


@router.put(
    "",
    response_model=AppSettingsRead,
    summary="Update application runtime settings",
)
@router.patch(
    "",
    response_model=AppSettingsRead,
    summary="Partially update application runtime settings",
)
async def update_settings(
    update_data: AppSettingsUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> AppSettingsRead:
    """Update runtime settings (LLM auto parse mode, Ollama and cloud model options)."""
    stmt = select(AppSettings).where(AppSettings.id == 1)
    result = await db.execute(stmt)
    app_setting = result.scalar_one_or_none()

    if not app_setting:
        app_setting = AppSettings(
            id=1,
            auto_parse_mode=update_data.auto_parse_mode or settings.INITIAL_AUTO_PARSE_MODE,
            ollama_base_url=update_data.ollama_base_url or settings.INITIAL_OLLAMA_BASE_URL,
            ollama_model=update_data.ollama_model or settings.INITIAL_OLLAMA_MODEL,
            api_provider=update_data.api_provider or settings.INITIAL_API_PROVIDER,
            api_model=update_data.api_model or settings.INITIAL_API_MODEL,
        )
        db.add(app_setting)
    else:
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(app_setting, field, value)

    await db.commit()
    await db.refresh(app_setting)
    logger.info(
        "Updated application settings (mode=%s, provider=%s)",
        app_setting.auto_parse_mode,
        app_setting.api_provider,
    )
    return _build_app_settings_read(app_setting)


@router.post(
    "/test-ollama",
    response_model=SettingsConnectionTestResponse,
    summary="Test connection to local Ollama instance and verify model availability",
)
async def test_ollama_connection(
    payload: OllamaTestRequest,
    db: AsyncSession = Depends(get_db_session),
) -> SettingsConnectionTestResponse:
    """Connect to Ollama /api/tags, measure latency, and verify target model."""
    stmt = select(AppSettings).where(AppSettings.id == 1)
    result = await db.execute(stmt)
    app_setting = result.scalar_one_or_none()

    base_url = (
        (payload.ollama_base_url or (app_setting.ollama_base_url if app_setting else None) or "")
        .strip()
        .rstrip("/")
    )
    target_model = (
        payload.ollama_model or (app_setting.ollama_model if app_setting else None) or ""
    ).strip()

    if not base_url:
        return SettingsConnectionTestResponse(
            success=False,
            message="Brak skonfigurowanego adresu URL dla Ollama.",
        )

    start_time = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/tags")
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if resp.status_code != 200:
            return SettingsConnectionTestResponse(
                success=False,
                latency_ms=latency_ms,
                message=f"Serwer Ollama zwrócił kod HTTP {resp.status_code}: {resp.text[:200]}",
            )

        data = resp.json()
        raw_models = data.get("models", [])
        available_models = [
            m.get("name")
            for m in raw_models
            if isinstance(m, dict) and "name" in m and isinstance(m["name"], str)
        ]

        if target_model:
            model_exists = any(
                m == target_model
                or m.startswith(f"{target_model}:")
                or target_model.startswith(f"{m}:")
                for m in available_models
            )
            if not model_exists:
                models_str = (
                    ", ".join(available_models)
                    if available_models
                    else "brak zainstalowanych modeli"
                )
                return SettingsConnectionTestResponse(
                    success=False,
                    latency_ms=latency_ms,
                    available_models=available_models,
                    message=(
                        f"Połączono z Ollama, ale model '{target_model}' nie został znaleziony. "
                        f"Dostępne modele: {models_str}."
                    ),
                )

            return SettingsConnectionTestResponse(
                success=True,
                latency_ms=latency_ms,
                available_models=available_models,
                message=(
                    f"Pomyślnie połączono z Ollama ({base_url}). "
                    f"Model '{target_model}' jest gotowy do użycia."
                ),
            )

        return SettingsConnectionTestResponse(
            success=True,
            latency_ms=latency_ms,
            available_models=available_models,
            message=f"Pomyślnie połączono z Ollama ({base_url}).",
        )
    except httpx.TimeoutException:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return SettingsConnectionTestResponse(
            success=False,
            latency_ms=latency_ms,
            message=(
                f"Przekroczono limit czasu połączenia (5.0s) z instancją "
                f"Ollama pod adresem {base_url}."
            ),
        )
    except httpx.ConnectError:
        return SettingsConnectionTestResponse(
            success=False,
            message=(
                f"Nie udało się połączyć z serwerem Ollama pod adresem {base_url}. "
                "Upewnij się, że usługa Ollama działa."
            ),
        )
    except Exception as exc:
        return SettingsConnectionTestResponse(
            success=False,
            message=f"Błąd podczas testu połączenia z Ollama: {exc}",
        )


@router.post(
    "/test-cloud",
    response_model=SettingsConnectionTestResponse,
    summary="Test connection to Cloud LLM provider (Gemini or OpenAI)",
)
async def test_cloud_connection(
    payload: CloudTestRequest,
    db: AsyncSession = Depends(get_db_session),
) -> SettingsConnectionTestResponse:
    """Validate cloud API credentials and execute probe completion via litellm."""
    stmt = select(AppSettings).where(AppSettings.id == 1)
    result = await db.execute(stmt)
    app_setting = result.scalar_one_or_none()

    provider = payload.provider
    db_model = (
        app_setting.api_model if (app_setting and app_setting.api_provider == provider) else None
    )
    model = (payload.model or db_model or "").strip()

    if not model:
        if provider == "gemini":
            model = "gemini-3.8-flash"
        elif provider == "openai":
            model = "gpt-4o-mini"
        else:
            return SettingsConnectionTestResponse(
                success=False,
                message=f"Nieobsługiwany dostawca chmury: {provider}",
            )

    if provider == "gemini":
        key = settings.GEMINI_API_KEY
        if not _is_valid_api_key(key):
            return SettingsConnectionTestResponse(
                success=False,
                message="Brak skonfigurowanego lub niepoprawny klucz GEMINI_API_KEY w pliku .env.",
            )
        litellm_model = model if model.startswith("gemini/") else f"gemini/{model}"
    elif provider == "openai":
        key = settings.OPENAI_API_KEY
        if not _is_valid_api_key(key):
            return SettingsConnectionTestResponse(
                success=False,
                message="Brak skonfigurowanego lub niepoprawny klucz OPENAI_API_KEY w pliku .env.",
            )
        litellm_model = model
    else:
        return SettingsConnectionTestResponse(
            success=False,
            message=f"Nieobsługiwany dostawca chmury: {provider}",
        )

    start_time = time.perf_counter()
    try:
        import litellm

        response = await litellm.acompletion(
            model=litellm_model,
            api_key=key,
            messages=[
                {"role": "system", "content": "Jesteś testerem połączenia KandidFlow."},
                {"role": "user", "content": "Odpowiedz 'ok'"},
            ],
            max_tokens=5,
            timeout=10.0,
        )
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        reply = response.choices[0].message.content or ""
        return SettingsConnectionTestResponse(
            success=True,
            latency_ms=latency_ms,
            message=(
                f"Pomyślnie połączono z dostawcą {provider.upper()} ({model}). "
                f"Odpowiedź: {reply.strip()}"
            ),
        )
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return SettingsConnectionTestResponse(
            success=False,
            latency_ms=latency_ms,
            message=f"Błąd komunikacji z modelem chmurowym {provider} ({model}): {exc}",
        )
