# KandidFlow — Global Agent Rules

## 1. Inviolable Rules (Złote Zasady)

1. **Architecture & Plan Approval Gate:** Before modifying code, database models, API contracts, or system architecture, always inspect `@SPECIFICATION.md` and generate an **Implementation Plan** artifact for review (with `RequestFeedback: true`). The Lead Orchestrator **MUST STOP** calling tools and await explicit user confirmation. Spawning subagents, modifying files, or executing tasks without the user's prior approval of the plan is **STRICTLY FORBIDDEN**.
2. **Docker-Only Execution (NEVER Run on Host):**
   - **STRICTLY FORBIDDEN on host:** `pip`, `uv`, `poetry`, `npm`, `npx`, `ruff`, `tsc`, `alembic`, or running dev servers directly on the host machine.
   - All runtime environments, dependencies, database migrations, linters, and build steps MUST execute inside Docker containers via `docker compose exec <service> <command>` or `docker compose run --rm <service> <command>`.
   - Add new dependencies directly to `backend/pyproject.toml` or `frontend/package.json`, then rebuild via `docker compose build <service> && docker compose up -d <service>`.
3. **Schema-First & Zero Raw Dicts for JSONB:**
   - Define all database schema changes and API payloads in Pydantic v2 schemas (`backend/app/schemas/`) BEFORE implementing frontend or extension logic.
   - Using raw `dict`, `dict[str, Any]`, or `Any` for PostgreSQL `JSONB` columns (`raw_payload`, `structured_data`, `contact_info`, `sections`, `default_sections`, `layout_schema`) or TypeScript `any` / `Record<string, unknown>` is **STRICTLY FORBIDDEN**. Every JSONB structure requires explicit, nested Pydantic v2 models and 1:1 mirrored TypeScript interfaces.
4. **English Codebase & Polish UI:** All code, comments, documentation, database identifiers, and variable/function names must be in English. All user-facing web UI strings, extension UI labels, and default Polish CV templates must be in Polish.
5. **No Secrets in Repo or Database:** Load `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `EXTENSION_API_TOKEN` exclusively from `.env` via Pydantic `BaseSettings` (documented in `.env.example`). Never commit secrets or store them in the `app_settings` table.
6. **License Compliance:** All contributions must comply with the GNU AGPLv3 license.
7. **Controlled Git Commits & Pushes:** Subagents are strictly forbidden from executing `git commit` or `git push`. Only the **Lead Orchestrator** commits and pushes changes to the remote repository (`main` by default, or user-specified branch). Commits are executed **strictly upon explicit user approval**, featuring a structured multi-line message (Conventional Commits header + concise bulleted body in English).

## 2. Lead Orchestrator Scope
- Root files (`docker-compose*.yml`, `.env.example`, `.github/`, `README.md`, `AGENTS.md`, `SPECIFICATION.md`) belong to the Lead Orchestrator scope.
- Maintain parity between local development (`docker-compose.override.yml`) and production (`docker-compose.yml`).
- Git version control operations (`commit`, `push`) are exclusively handled by the Lead Orchestrator.

## 3. Interaction & Subagent Orchestration Workflow
- **Single Point of Contact:** The user interacts exclusively with the **Lead Orchestrator** in the chat.
- **Project Status & Diagnostics:** The Lead Orchestrator inspects `@SPECIFICATION.md`, git logs, and Docker container health to answer project status questions.
- **Feature Requests & Bug Fixes (Three-Phase Workflow):**
  - **Phase 1: Planning & Approval Gate (Mandatory Stop)**
    1. The Lead Orchestrator performs impact analysis against `@SPECIFICATION.md` and generates an **Implementation Plan** artifact (with `RequestFeedback: true`).
    2. The Lead Orchestrator presents the plan to the user, asks for approval, and **STOPS calling tools**. No subagents or modifications may run until the user confirms.
  - **Phase 2: Execution & Subagent Delegation**
    1. Once the user approves the plan, the Lead Orchestrator decomposes tasks and delegates them to specialized subagents (`.agents/agents/`):
       - `backend-specialist` (Skills: `@schema-sync`, `@db-migration`, `@typst-cv`, `@docker-check`, `@test-runner`)
       - `extension-specialist` (Skills: `@extractor-test`)
       - `frontend-specialist` (Skills: `@docker-check`, TypeScript 1:1 mirroring, Polish UI, Light & Dark mode support)
    2. Quality Gates are verified inside Docker after each subagent run.
  - **Phase 3: Review & Git Release Gate**
    1. The Lead Orchestrator presents a unified summary of changes and verification results to the user.
    2. The Lead Orchestrator explicitly asks the user whether to commit and push changes.
    3. Upon the user's explicit confirmation and approval, the Lead Orchestrator invokes `@git-commit` to create a structured commit and push to `main` (or user-specified branch).