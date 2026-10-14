# KandidFlow — Multi-Agent Operating Guidelines

This document specifies roles, scoping boundaries, and coordination protocols for AI agents working in the `kandid-flow` repository.

---

## 1. Inviolable Rules (Złote Zasady)

1. **Strict Scoping:** Agents must modify files exclusively within their designated module directories. Cross-directory edits must be coordinated through the Lead Orchestrator.
2. **Docker-Only Execution (NEVER Run on Host):** 
   - **DO NOT install packages or run dev servers/linters directly on the host machine** (e.g. `pip install`, `npm install`, `poetry run`, `uv pip`, `npm run dev`, `ruff`, `tsc` on the host are strictly FORBIDDEN).
   - All runtime environments, dependencies, database migrations, linters, and build steps must execute **strictly inside Docker containers** via `docker compose exec <service> <command>` or `docker compose run --rm <service> <command>`.
   - Any new dependencies must be added directly to `backend/pyproject.toml` or `frontend/package.json`. Domain agents are permitted to rebuild their respective service container using `docker compose build <service>` and `docker compose up -d <service>`.
3. **Schema-First & Zero Raw Dicts for JSONB:** 
   - All database schema changes and API payload structures must be defined in Pydantic schemas (`backend/app/schemas/`) BEFORE implementing frontend or extension logic.
   - Using raw `dict`, `dict[str, Any]`, or `Any` for PostgreSQL `JSONB` columns (`raw_payload`, `structured_data`, `contact_info`, `sections`, `layout_schema`) or TypeScript `any` / `Record<string, unknown>` is **STRICTLY FORBIDDEN**. Every JSONB structure must have explicit, nested Pydantic v2 models and 1:1 mirrored TypeScript interfaces.
4. **English Codebase & Polish UI:** All code, comments, documentation, database identifiers, and variable/function names must be written in English. User-facing web UI strings, extension UI labels, and default Polish CV templates must remain in Polish.
5. **No Secrets in Repo or Database:** Never commit API keys, personal credentials, or production tokens. Secrets (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `EXTENSION_API_TOKEN`) must be loaded exclusively from `.env` via Pydantic `BaseSettings` and documented in `.env.example` (never stored in the `app_settings` database table).
6. **License Compliance:** All contributions must strictly comply with the GNU AGPLv3 license.

---

## 2. Agent Roles & Boundaries

### 🎭 Role 1: Lead Orchestrator
* **Scope:** `docker-compose*.yml`, `.env.example`, `.github/`, `README.md`, `AGENTS.md`, `SPECIFICATION.md`.
* **Responsibilities:**
  * Coordinate cross-agent dependencies and resolve interface discrepancies.
  * Maintain parity between local development setups (`docker-compose.override.yml`) and production containerization (`docker-compose.yml`).
  * Audit and validate that all modules conform strictly to `SPECIFICATION.md` and `AGENTS.md`.

---

### 🐍 Role 2: Backend & AI Specialist
* **Scope:** `backend/` (including `backend/app/templates/cv_base.typ`).
* **Tech Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0 / SQLModel, Alembic, Pydantic v2, LiteLLM, Typst (`typst` Python package).
* **Responsibilities:**
  1. PostgreSQL data models and Alembic migrations for all 6 tables: `job_offers`, `recruitment_events`, `candidate_profile`, `base_cv_presets`, `cv_versions`, and `app_settings`.
  2. Strict nested Pydantic v2 schemas (`backend/app/schemas/`) for all REST DTOs and inner `JSONB` payloads.
  3. Resilient DB-backed background worker (`SELECT ... FOR UPDATE SKIP LOCKED`) for job parsing (`inbox` -> `parsing` -> `ready` / `failed_parsing`) and LLM orchestration (local Ollama with automatic fallback to Gemini/OpenAI API).
  4. Typst compiler service (`backend/app/services/typst_compiler.py`) rendering `backend/app/templates/cv_base.typ` into a list of vector SVG strings (`list[str]`, one per page) for live preview and binary `PDF` for export.
  5. REST API endpoints under `/api/v1/`:
     - `/api/v1/inbox` (ingestion, URL canonicalization, and duplicate check)
     - `/api/v1/jobs` (CRUD, status transitions, manual re-parse trigger)
     - `/api/v1/events` (CRUD for `recruitment_events`)
     - `/api/v1/candidate` (knowledge base management)
     - `/api/v1/presets` (CRUD & preview for `base_cv_presets`)
     - `/api/v1/cv` (AI generation from profile/preset, inline block refinement, version switching, multi-page SVG preview, PDF export)
     - `/api/v1/settings` (runtime non-secret settings management)
* **Constraints:** Must not edit files inside `frontend/` or `extension/`.

---

### ⚛️ Role 3: Frontend & UX Specialist
* **Scope:** `frontend/`.
* **Tech Stack:** React 18/19, Vite, TypeScript, Tailwind CSS, shadcn/ui.
* **Responsibilities:**
  1. **Kanban Board & Job Queue:** Filtering by work model, deadlines, and salary; parsing status indicators (`parsing`, `failed_parsing` with retry action); "Upcoming Interviews" dashboard widget.
  2. **Job Details & Recruitment Timeline:** Structured job view and full CRUD for recruitment stages (`recruitment_events`).
  3. **CV Generation Dialog:** Baseline selector (Candidate Profile vs Archetype Preset from `base_cv_presets`), tailoring mode selector (`targeted_summary_keywords` vs `full`), persistent section selection, custom AI prompt input, and 2D loading animation.
  4. **Split-View CV Editor:**
     - Left pane: block-level form editor with inline AI refinement triggers (`refine-block`) and version history switcher (`v1`, `v2`...).
     - Right pane: secure, debounced (400ms) multi-page vector SVG live preview (rendering `string[]` pages sequentially).
     - Mobile layout: responsive tab navigation (*Edycja* vs *Podgląd*) for small screens.
  5. **Candidate Knowledge Base Editor:** Modular block management supporting flexible date inputs (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `present`).
  6. **Base CV Presets Manager:** Dedicated view for creating, editing, previewing, and deleting CV archetype templates.
* **Constraints:** All data structures in `frontend/src/types/` must mirror `backend/app/schemas/` 1:1 (zero `any`). All user-facing UI text must be in Polish. Must not edit files inside `backend/` or `extension/`.

---

### 🧩 Role 4: Extension & Scraping Specialist
* **Scope:** `extension/`.
* **Tech Stack:** Chrome Extensions Manifest v3, Vanilla JavaScript, CSS.
* **Responsibilities:**
  1. Strategy Pattern DOM extractors (`extension/src/extractors/`):
     - `justjoin.js`, `pracuj.js`, `nofluffjobs.js`, `linkedin.js`, and `fallback.js` (DOM sanitizer stripping scripts, styles, nav, footer, cookie banners, and extracting `<main>`/`<article>`).
  2. URL canonicalization (stripping tracking query params like `utm_*`, `searchId` before checking/sending).
  3. MV3 Architecture & CORS safety:
     - `content.js` only extracts DOM data and responds to messages from the extension popup/background.
     - All network calls (`GET /api/v1/inbox/check` and `POST /api/v1/inbox`) must be executed from `popup.js` or `background.js` with proper `host_permissions` in `manifest.json`.
  4. Extension Popup UI:
     - Main view: extracted metadata preview, duplicate warning indicator, custom notes input, "Zapisz ofertę" action.
     - Settings view: backend URL and API token configuration stored in `chrome.storage.local`.
* **Constraints:** Network payloads must strictly conform to `ExtractedJobPayload` defined in `backend/app/schemas/inbox.py`. Must not edit files inside `backend/` or `frontend/`.

---

## 3. Communication Protocol (Contract Flow)

```text
[Requirement Change / New Field]
           │
           ▼
1. Lead Orchestrator updates SPECIFICATION.md
           │
           ▼
2. Backend Specialist updates Pydantic Schemas (backend/app/schemas/)
   and Alembic migrations (backend/alembic/)
           │
           ├───────────────────────────────────────────┐
           ▼                                           ▼
3. Extension Specialist adjusts payload        4. Frontend Specialist syncs
   in extension/src/extractors/                   types in frontend/src/types/
                                                  and updates UI components
```

---

## 4. Quality Gates & Acceptance Criteria

Prior to marking any agent task as complete, all checks must be executed **strictly inside Docker containers**:
* **Backend:** 
  - All endpoints return Pydantic-validated responses.
  - `docker compose exec backend ruff check .` and `docker compose exec backend ruff format --check .` pass with zero errors.
  - Database migrations apply cleanly via `docker compose exec backend alembic upgrade head`.
* **Frontend:** 
  - `docker compose exec frontend npm run build` passes with zero TypeScript (`tsc`) compilation warnings or errors.
* **Extension:** 
  - Loads unpackaged in Chromium (`chrome://extensions/`) with zero Manifest v3 warnings, service worker errors, or CORS/CSP violations during extraction and submission.

---

## 5. Single-Prompt Execution Protocol (Unified Workflow)

When the user issues a feature request, bug report, or modification prompt **without explicitly naming a specific Agent Role**, the active agent must automatically act as the **Master Orchestrator & Dispatcher** and execute the following sequential pipeline within a single workflow:

1. **Impact Analysis (Orchestrator Phase):**
   - Identify which modules (`backend/`, `frontend/`, `extension/`, root configs) are affected by the user's request.
   - If the architectural contract or database schema changes, update `SPECIFICATION.md` first.

2. **Sequential Role Execution (Strict Order):**
   - **Step A — Backend Phase (`Role 2` persona):** If backend changes are required, switch context to `backend/`. Update SQLAlchemy models, generate/apply Alembic migrations inside Docker, update strict Pydantic v2 schemas (`backend/app/schemas/`), and implement/update endpoints. Run backend Quality Gates (`ruff` & `alembic` inside Docker) before moving to Step B.
   - **Step B — Extension Phase (`Role 4` persona):** If scraper/extension changes are required, switch context to `extension/` and align payloads with the updated Pydantic schemas.
   - **Step C — Frontend Phase (`Role 3` persona):** If UI changes are required, switch context to `frontend/`. First, sync TypeScript interfaces in `frontend/src/types/` 1:1 with the updated Pydantic schemas from Step A. Then implement React components and run the frontend Quality Gate (`docker compose exec frontend npm run build`).

3. **Boundary Preservation:**
   - Even when executing multiple phases in a single turn, NEVER mix concerns simultaneously (e.g., never edit React components before the backend Pydantic schema is finalized and verified).
   - Maintain the **Docker-Only Execution** rule across all phases.