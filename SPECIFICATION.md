# KandidFlow — Product & Technical Requirements Document (PRD/TRD)

**Version:** 1.1  
**License:** GNU Affero General Public License v3.0 (AGPLv3)  
**Target Environment:** Self-hosted (Docker Compose / Proxmox VE), remote access via Cloudflare Tunnel / Cloudflare Access.  
**GitHub Repository:** `kandid-flow`

---

## 1. Project Overview & Objective (Executive Summary)

**KandidFlow** is a self-hosted, modular platform for automating the IT recruitment workflow. The application eliminates the repetitive overhead of manual job copying, tedious formatting in graphic/document editors, and repetitive manual tailoring of application documents.

The system consists of three cooperating components:
1. **Browser Extension (Chromium MV3):** Capturing job postings from Polish and international job portals (Just Join IT, Pracuj.pl, No Fluff Jobs, LinkedIn) with automated URL canonicalization, noise removal, and metadata extraction.
2. **Backend & AI Engine (Python / FastAPI / Typst):** Normalizing job offers using a hybrid model chain (local Ollama with automatic fallback to cloud APIs) via a resilient database-backed queue, maintaining a strictly typed candidate knowledge base, scheduling recruitment pipeline events, tailoring resume contents, and providing instant Typst compilation to multi-page SVG (live preview) and PDF.
3. **Web UI (React / Vite / Tailwind / shadcn/ui):** Responsive Polish-language interface for pipeline tracking, recruitment event management, candidate profile management, base CV presets, and CV editing via a Split-View workspace with AI section assistance and version history.

---

## 2. System Architecture & Components

```text
┌────────────────────────────────────────────────────────┐
│             Chromium Extension (Manifest v3)           │
│   [Content Extractors] ──▶ [Popup / Service Worker]    │
└───────────────────────────┬────────────────────────────┘
                            │ POST /api/v1/inbox (API Token Auth)
                            ▼
┌────────────────────────────────────────────────────────┐
│            KandidFlow Backend (FastAPI Core)           │
│                                                        │
│  ┌───────────────────┐        ┌─────────────────────┐  │
│  │ Ingestion & DB    │───────▶│ LLM Orchestrator    │  │
│  │ Queue Worker      │        │ (LiteLLM / Fallback)│  │
│  └─────────┬─────────┘        └──────────┬──────────┘  │
│            │                             │             │
│            ▼                             ▼             │
│  ┌───────────────────┐        ┌─────────────────────┐  │
│  │ PostgreSQL DB     │        │ Typst Engine        │  │
│  │ (Relational+JSONB)│        │ (.typ ─▶ SVGs / PDF)│  │
│  └─────────▲─────────┘        └──────────┬──────────┘  │
│            │                             │             │
└────────────┼─────────────────────────────┼─────────────┘
             │ REST API                    │ SVG[] / PDF
             ▼                             ▼
┌────────────────────────────────────────────────────────┐
│             Web UI (React + Vite + shadcn/ui)          │
│   [Kanban Board] ── [Split-View Live CV] ── [Profile]  │
│   [Events Timeline] ── [Base CV Presets Manager]       │
└────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema (PostgreSQL)

*Note: All `JSONB` columns (`raw_payload`, `structured_data`, `contact_info`, `sections`, `default_sections`, `layout_schema`) MUST be validated at the application boundary using strict, nested Pydantic v2 models (no untyped `dict[str, Any]`).*

### 3.1. Table: `job_offers`
Stores imported job postings and recruitment pipeline statuses.
* `id`: `UUID` (PK, default `gen_random_uuid()`)
* `source_url`: `TEXT NOT NULL UNIQUE` (canonicalized URL stripped of tracking parameters like `utm_*`, `searchId`, etc.)
* `source_portal`: `VARCHAR(50)` (`justjoin`, `pracuj`, `nofluffjobs`, `linkedin`, `generic`)
* `company_name`: `VARCHAR(255)`
* `role_title`: `VARCHAR(255)`
* `status`: `VARCHAR(50) NOT NULL DEFAULT 'inbox'` (`inbox`, `parsing`, `failed_parsing`, `ready`, `applied`, `interview`, `rejected`, `offer`)
* `error_message`: `TEXT NULL` (populated if AI parsing fails)
* `language`: `VARCHAR(10) NOT NULL DEFAULT 'pl'` (`pl`, `en`)
* `work_model`: `VARCHAR(50)` (`remote`, `hybrid`, `onsite`)
* `work_model_details`: `TEXT` (e.g., *"Hybryda: 2 dni w miesiącu w biurze"*)
* `locations`: `TEXT[] DEFAULT '{}'` (list of cities/offices, e.g. `{"Warszawa", "Kraków"}`)
* `location_raw`: `TEXT NULL` (unmodified location string from posting)
* `application_deadline`: `DATE NULL`
* `salary_min`: `INTEGER NULL`
* `salary_max`: `INTEGER NULL`
* `salary_currency`: `VARCHAR(10) DEFAULT 'PLN'`
* `contract_type`: `VARCHAR(50)` (B2B, UoP, etc.)
* `raw_payload`: `JSONB NOT NULL` (original extraction payload from extension validated via `ExtractedJobPayload`)
* `structured_data`: `JSONB NULL` (must-have/nice-to-have requirements, tech stack, role summary parsed by AI validated via `StructuredJobData`)
* `notes`: `TEXT NULL`
* `created_at`: `TIMESTAMPTZ DEFAULT NOW()`
* `updated_at`: `TIMESTAMPTZ DEFAULT NOW()`

### 3.2. Table: `recruitment_events`
Stores scheduled recruitment stages, interviews, tests, and deadlines tied to specific job offers.
* `id`: `UUID` (PK, default `gen_random_uuid()`)
* `job_offer_id`: `UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE`
* `event_type`: `VARCHAR(50) NOT NULL` (`hr_screening`, `technical_interview`, `task_deadline`, `manager_interview`, `other`)
* `title`: `VARCHAR(255) NOT NULL` (e.g., *"Rozmowa techniczna - live coding"*, *"HR screening z Julią"*)
* `scheduled_at`: `TIMESTAMPTZ NOT NULL` (exact date and time of the event)
* `duration_minutes`: `INTEGER DEFAULT 60`
* `location_or_link`: `TEXT NULL` (e.g., Google Meet link, Teams URL, office address)
* `interviewers`: `TEXT NULL` (names/roles of the recruitment team members)
* `notes`: `TEXT NULL` (preparation notes, questions to ask, post-interview feedback)
* `is_completed`: `BOOLEAN NOT NULL DEFAULT FALSE`
* `created_at`: `TIMESTAMPTZ DEFAULT NOW()`
* `updated_at`: `TIMESTAMPTZ DEFAULT NOW()`

### 3.3. Table: `candidate_profile`
Master knowledge base of the candidate, editable via Web UI.
* `id`: `UUID` (PK)
* `full_name`: `VARCHAR(255) NOT NULL`
* `contact_info`: `JSONB NOT NULL` (email, phone, location, GitHub/LinkedIn/portfolio links validated via `CandidateContactInfo`)
* `sections`: `JSONB NOT NULL` (polymorphic array of blocks: education, certificates, experience, projects, skills with flexible date strings e.g. `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `present` validated via `list[CandidateSectionBlock]`)
* `default_sections`: `JSONB NOT NULL` (array of section IDs selected by default in the CV generation dialog)
* `updated_at`: `TIMESTAMPTZ DEFAULT NOW()`

### 3.4. Table: `base_cv_presets`
Pre-crafted archetype templates (e.g. *"Flutter Developer"*, *"DevOps Engineer"*) serving as reusable starting baselines for rapid, job-tailored resume generation.
* `id`: `UUID` (PK, default `gen_random_uuid()`)
* `title`: `VARCHAR(100) NOT NULL` (e.g., *"Flutter Developer"*, *"DevOps / Linux Administrator"*)
* `language`: `VARCHAR(10) NOT NULL DEFAULT 'pl'` (`pl`, `en`)
* `layout_schema`: `JSONB NOT NULL` (pre-crafted structured CV blocks: summary, skills, experience, projects, education, certificates, clause validated via `CVLayoutSchema`)
* `created_at`: `TIMESTAMPTZ DEFAULT NOW()`
* `updated_at`: `TIMESTAMPTZ DEFAULT NOW()`

### 3.5. Table: `cv_versions`
Versioned historical records of generated and tailored CVs.
* `id`: `UUID` (PK, default `gen_random_uuid()`)
* `job_offer_id`: `UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE`
* `parent_preset_id`: `UUID NULL REFERENCES base_cv_presets(id) ON DELETE SET NULL` (optional archetype preset used as starting point)
* `version_number`: `INTEGER NOT NULL DEFAULT 1`
* `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
* `language`: `VARCHAR(10) NOT NULL DEFAULT 'pl'` (`pl`, `en`)
* `layout_schema`: `JSONB NOT NULL` (dynamic array of CV blocks and contents validated via `CVLayoutSchema`)
* `change_summary`: `TEXT NULL` (e.g., *"Initial AI generation"*, *"Shortened project description"*)
* `created_at`: `TIMESTAMPTZ DEFAULT NOW()`

### 3.6. Table: `app_settings`
Runtime application configuration (Non-secret settings only; all API keys and tokens are injected strictly from `.env`).
* `id`: `INTEGER PRIMARY KEY DEFAULT 1`
* `auto_parse_mode`: `VARCHAR(50) DEFAULT 'auto_ollama_fallback_api'` (`auto_ollama_fallback_api`, `auto_ollama_only`, `auto_api_only`, `manual`)
* `ollama_base_url`: `TEXT DEFAULT '[http://host.docker.internal:11434](http://host.docker.internal:11434)'`
* `ollama_model`: `VARCHAR(100) DEFAULT 'qwen2.5:14b'`
* `api_provider`: `VARCHAR(50) DEFAULT 'gemini'`
* `api_model`: `VARCHAR(100) DEFAULT 'gemini-2.5-flash'`
* `updated_at`: `TIMESTAMPTZ DEFAULT NOW()`

---

## 4. Module Architecture

### 4.1. Browser Extension (`extension/`)
* **Standard:** Manifest v3 (Vanilla JavaScript, zero bundlers/npm).
* **Execution & Security Architecture:**
  * `content.js` + `extractors/*.js`: Executed in page context solely to inspect DOM, canonicalize `source_url` (stripping tracking query parameters), and return `ExtractedJobPayload` via message passing (`chrome.runtime.onMessage`).
  * `popup.js` / `background.js`: Performs all HTTP requests (`GET /api/v1/inbox/check?url=...` for duplicate detection and `POST /api/v1/inbox` for submission) to avoid CORS and page-level CSP blocks.
* **Extraction (Strategy Pattern):**
  * `extractors/justjoin.js`: skill tags, salary ranges, location list, description container.
  * `extractors/pracuj.js`: targeted sections via `section[data-test="section-..."]`, office cities, stripping corporate perks and footer.
  * `extractors/nofluffjobs.js`: must-have and nice-to-have requirements, locations, header metadata.
  * `extractors/linkedin.js`: main description container excluding sidebar widgets.
  * `extractors/fallback.js`: DOM sanitizer stripping `nav`, `footer`, `script`, `style`, cookie consent elements, and grabbing `<main>` or `<article>`.
* **Popup UI:**
  * Main View: active tab title, canonical URL, duplicate warning badge (if URL already exists in DB), optional note input, "Zapisz ofertę" action button, operation status.
  * Settings View: backend `server_url` and `api_token` persisted via `chrome.storage.local`.

### 4.2. Backend (`backend/`)
* **Framework:** FastAPI (Python 3.12+) with Pydantic v2 and SQLAlchemy 2.0 / SQLModel.
* **Secrets Management:** `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `EXTENSION_API_TOKEN` are loaded exclusively via Pydantic `BaseSettings` from `.env` (never stored in PostgreSQL).
* **Resilient Ingestion & DB Queue Worker (`services/job_parser.py`):**
  * Asynchronous background loop polling `job_offers` with `status = 'inbox'` using `SELECT ... FOR UPDATE SKIP LOCKED`, transitioning state to `parsing` -> `ready` (or `failed_parsing` with `error_message` on failure).
  * Provides manual retry endpoint (`POST /api/v1/jobs/{id}/reparse`).
* **LLM Engine (`services/llm_client.py`):**
  * Enforces **Structured Outputs** (JSON Schema derived from Pydantic models) with static typing guarantees.
  * Resilience chain implementation: attempts local Ollama first -> on network/timeout/validation error, automatically falls back to cloud API (Gemini/OpenAI).
  * Supports full CV generation as well as block-level inline AI refinement (`POST /api/v1/cv/{id}/refine-block`).
* **Typst Compiler (`services/typst_compiler.py`):**
  * Powered by the official Rust-backed `typst` Python package.
  * Template `backend/app/templates/cv_base.typ`: clean single-column, ATS-optimized layout iterating over arbitrary section blocks defined in `CVLayoutSchema`.
  * Preview Output: JSON array of vector `SVG` strings (`list[str]`, one SVG string per page) for sub-50ms multi-page live preview.
  * Export Output: binary `PDF` stream with selectable text and embedded links.

### 4.3. Web UI (`frontend/`)
* **Stack:** React 18/19 + Vite + TypeScript + Tailwind CSS + shadcn/ui.
* **Localization:** UI labels, placeholders, and actions are rendered in Polish.
* **Core Views:**
  1. **Job Pipeline (Queue / Kanban):** Job cards with work model badges, location badges, salary badges, parsing status indicators (`parsing` spinner / `failed_parsing` retry button), and application countdown timers. Includes an "Upcoming Interviews" widget highlighting scheduled recruitment events.
  2. **Job Details & Recruitment Timeline:** Detailed job description, structured requirements breakdown, and recruitment events management (`/api/v1/events`: add/edit stages, interview links, preparation notes, mark as completed).
  3. **CV Generator Dialog:** Modal offering starting point selection: either raw Candidate Knowledge Base or an existing **Archetype Preset** (`base_cv_presets`), tailoring mode selector (*"Tylko podsumowanie i słowa kluczowe"* [`targeted_summary_keywords`] vs *"Pełne dostosowanie"* [`full`]), section selection modal (persisting defaults), custom AI instructions field, 2D loading animation during processing, immediately saving `v1` (with `parent_preset_id` if selected) to the database before redirecting to the editor.
  4. **CV Editor (Split-View):**
     * Left pane: structured block editing with inline AI refinement actions (*"Skróć podsumowanie"*, *"Zmień nacisk na DevOps"*), version switcher (`v1`, `v2`...).
     * Right pane: live, debounced (400ms) multi-page vector SVG preview (`string[]` rendered vertically page-by-page) with responsive scaling.
     * Mobile view: automatic tab switching (*Edycja* vs *Podgląd*) for ergonomic mobile editing.
  5. **Candidate Knowledge Base:** Modular block management (education, certificates, projects, experience) supporting flexible date expressions (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `present`).
  6. **Base CV Presets / Archetypes Manager:** Management workspace (`/api/v1/presets`) for creating, editing, live-previewing (via Typst SVG), and deleting role archetype presets.

---

## 5. User Flows

1. **Saving Job Posting:** User clicks extension icon -> extension canonicalizes URL and checks if offer exists -> user clicks "Zapisz ofertę" -> `POST /api/v1/inbox` -> backend saves `inbox` record -> DB worker picks up record (`parsing`), normalizes offer via Ollama/API fallback -> job state transitions to `ready` (or `failed_parsing` on error).
2. **Scheduling Recruitment Stage:** User opens job details -> clicks "Dodaj etap rekrutacji" -> sets title, date, meeting URL, and notes -> entry is persisted in `recruitment_events` and surfaced on the dashboard.
3. **Generating & Refining CV:** User clicks "Generuj CV" -> selects baseline source (Candidate Knowledge Base or Archetype Preset) -> selects tailoring mode (`targeted_summary_keywords` or `full`) -> backend synthesizes tailored content via LLM and **immediately commits `cv_versions` (v1)** -> Split-View editor opens -> user edits fields or triggers inline AI block refinement -> multi-page SVG preview updates in real time -> PDF downloaded on demand.
4. **Updating Profile & Presets:** User modifies blocks in "Moja baza wiedzy" or "Szablony bazowe (Presety)" -> changes persist directly to PostgreSQL with strict Pydantic schema validation.

---

## 6. Monorepo Directory Structure (`kandid-flow/`)

```text
kandid-flow/
├── .github/workflows/
│   ├── backend-ci.yml
│   └── frontend-ci.yml
├── LICENSE                          # GNU AGPLv3
├── README.md
├── AGENTS.md                        # Multi-Agent Operating Guidelines
├── SPECIFICATION.md                 # Product & Technical Requirements
├── docker-compose.yml               # Production compose
├── docker-compose.override.yml      # Local dev: bind mounts, hot-reload
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic/
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/                  # SQLModel / SQLAlchemy (job, event, candidate, cv, settings, preset)
│       ├── schemas/                 # Strict Pydantic v2 DTOs + JSONB inner models
│       ├── services/                # llm_client, job_parser, cv_generator, typst_compiler
│       ├── templates/
│       │   └── cv_base.typ          # ATS-friendly Typst template
│       └── api/v1/                  # inbox, jobs, events, candidate, cv, presets, settings
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── components/              # shadcn/ui, kanban, events, cv-editor, cv-preview, profile, presets
│       ├── hooks/
│       ├── lib/
│       └── types/                   # 1:1 TypeScript mirrors of backend/app/schemas/
│
└── extension/
    ├── manifest.json                # Manifest v3
    ├── popup.html
    ├── popup.js
    ├── popup.css
    ├── icons/
    └── src/
        ├── background.js            # Service Worker for API communication (optional if handled in popup.js)
        ├── content.js               # DOM extraction dispatcher & URL canonicalizer
        └── extractors/              # justjoin, pracuj, nofluffjobs, linkedin, fallback
```