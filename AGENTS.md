# KandidFlow — Global Agent Rules

## 1. Inviolable Rules (Złote Zasady)

1. **Two-Tier Planning & Approval Gate:**
   - **Full Pipeline (Mandatory Plan & Stop):** Required for new features, database/schema/JSONB/API contract changes, multi-module work, or architectural refactors. Inspect `@SPECIFICATION.md`, generate an **Implementation Plan** artifact (`RequestFeedback: true`, `UserFacing: true`), present it in Polish, and **STOP calling tools** until the user explicitly approves. Spawning subagents or editing code before approval is **STRICTLY FORBIDDEN**.
   - **Fast Track (No Plan Artifact Required):** Allowed for small, isolated single-module fixes (typos, minor copy/CSS adjustments, isolated unit test fixes) with zero schema, API, or architectural impact. All Docker-only, typing, quality-gate, and Git release rules still apply.
2. **Docker-Only Execution (NEVER Run on Host):**
   - **STRICTLY FORBIDDEN on host:** `pip`, `uv`, `poetry`, `npm`, `npx`, `ruff`, `tsc`, `alembic`, `pytest`, `uvicorn`, `vite`, or running dev servers directly on the host machine (mechanically enforced via `.agents/hooks.json`).
   - All runtime environments, dependencies, database migrations, linters, tests, and build steps MUST execute inside Docker containers via `docker compose exec <service> <command>` or `docker compose run --rm <service> <command>`.
   - Add new dependencies directly to `backend/pyproject.toml` or `frontend/package.json`, then rebuild via `docker compose build <service> && docker compose up -d <service>`.
3. **Schema-First & Zero Raw Dicts for JSONB:**
   - Define all database schema changes and API payloads in Pydantic v2 schemas (`backend/app/schemas/`) BEFORE implementing frontend or extension logic.
   - Using raw `dict`, `dict[str, Any]`, or `Any` for PostgreSQL `JSONB` columns or TypeScript `any` / `Record<string, unknown>` is **STRICTLY FORBIDDEN**. Every JSONB structure requires explicit, nested Pydantic v2 models and 1:1 mirrored TypeScript interfaces.
4. **English Codebase & Polish UI:** All code, comments, documentation, database identifiers, and variable/function names must be in English. All user-facing web UI strings, extension UI labels, and default Polish CV templates must be in Polish.
5. **No Secrets in Repo or Database:** Load `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `EXTENSION_API_TOKEN` exclusively from `.env` via Pydantic `BaseSettings` (documented in `.env.example`). Never commit secrets or store them in the `app_settings` table.
6. **License Compliance:** All contributions must comply with the GNU AGPLv3 license.
7. **Controlled Git Commits & Pushes:** Subagents are strictly forbidden from executing `git commit` or `git push`. Only the **Lead Orchestrator** commits and pushes changes to the remote repository (`main` by default, or user-specified branch), **strictly upon explicit user approval** via `@git-commit`.

## 2. Lead Orchestrator Scope
- Root files (`docker-compose*.yml`, `.env.example`, `.github/`, `README.md`, `AGENTS.md`, `SPECIFICATION.md`, `.agents/`) belong to the Lead Orchestrator scope.
- Maintain parity between local development (`docker-compose.override.yml`) and production (`docker-compose.yml`).
- Git version control operations (`commit`, `push`) are exclusively handled by the Lead Orchestrator.

## 3. Interaction & Subagent Orchestration
- **Single Point of Contact:** The user interacts exclusively with the **Lead Orchestrator** in the chat.
- **Project Status & Diagnostics:** The Lead Orchestrator inspects `@SPECIFICATION.md`, git logs, and Docker container health to answer project status questions.
- **Full Pipeline Orchestration:** For Full Pipeline tasks, follow the three-phase playbook in `@feature-pipeline`:
  1. **Phase 1 — Planning Gate:** Inspect `@SPECIFICATION.md`, produce an Implementation Plan artifact (`RequestFeedback: true`), and yield the turn for user approval.
  2. **Phase 2 — Specialist Delegation:** Delegate scoped work to `backend-specialist`, `extension-specialist`, and `frontend-specialist` (`.agents/agents/`), running independent `extension` and `frontend` tasks in parallel once backend schemas are finalized, and verifying all Docker quality gates.
  3. **Phase 3 — Review & Git Release Gate:** Summarize changes and verification results in Polish, then prompt via `ask_question` before invoking `@git-commit`.
