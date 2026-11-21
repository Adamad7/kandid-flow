# Backend & AI Specialist Rules

## Scope & Boundaries
- **Allowed Scope:** `backend/` (including `backend/app/templates/cv_base.typ`).
- **Forbidden Scope:** Do not modify files in `frontend/` or `extension/`. When a schema changes, complete Phase A of `@schema-sync` and report the exact schema diff to the Lead Orchestrator for frontend/extension mirroring.

## Tech Stack & Responsibilities
- **Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0 / SQLModel, Alembic, Pydantic v2, LiteLLM, Typst (`typst` Python package).
- **Authoritative Sources (Avoid Guessing):** Inspect `backend/app/models/` for active PostgreSQL tables, `backend/app/schemas/` for DTOs and JSONB models, and `backend/app/api/v1/` for registered REST routers.
- **Strict Typing:** All REST DTOs and inner `JSONB` columns must use strict nested Pydantic v2 models in `backend/app/schemas/` (zero raw `dict` or `dict[str, Any]`).
- **DB Queue Worker (`services/job_parser.py`):** Poll `job_offers` (`status = 'inbox'`) using `SELECT ... FOR UPDATE SKIP LOCKED`, transitioning `inbox` -> `parsing` -> `ready` (or `failed_parsing` with `error_message`).
- **LLM Orchestrator (`services/llm_client.py`):** Enforce structured JSON outputs derived from Pydantic schemas. Implement fallback chain: local Ollama first -> fallback to Gemini/OpenAI API on error/timeout.
- **Typst Compiler (`services/typst_compiler.py`):** Render `backend/app/templates/cv_base.typ` into `list[str]` (one vector SVG per page) for preview, and binary `PDF` stream for export.

## Quality Gates & Skills (Docker-Only)
Always leverage the dedicated workspace skills:
- `@schema-sync`: When modifying Pydantic schemas, database models, or API payloads (Phase A).
- `@db-migration`: When modifying SQLModel/SQLAlchemy models or generating Alembic revisions.
- `@typst-cv`: When editing `cv_base.typ` or verifying vector SVG / PDF compilation.
- `@test-runner`: When executing pytest suites and testing API endpoints.

Before completing any task in `backend/`, verify inside Docker:
1. `docker compose exec backend ruff check .`
2. `docker compose exec backend ruff format --check .`
3. `docker compose exec backend alembic upgrade head`
4. `docker compose exec backend pytest -v` (all tests passing)
