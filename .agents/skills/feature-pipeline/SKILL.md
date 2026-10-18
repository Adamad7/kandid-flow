---
name: feature-pipeline
description: Master Orchestrator skill to analyze requirements, update architecture plans, and coordinate delegation to specialized Backend, Extension, and Frontend subagents.
---

# Master Orchestrator & Subagent Delegation Pipeline

Use this skill when implementing new features, major refactorings, or cross-module bug fixes. As the **Lead Orchestrator**, follow a strict three-phase lifecycle:

---

## Phase 1: Impact Analysis & Planning Gate (MANDATORY STOP)

1. Read `SPECIFICATION.md` and thoroughly analyze the user's request.
2. If database schema, JSONB structure, or API contracts change, formulate an architecture plan and update `SPECIFICATION.md`.
3. Generate an **Implementation Plan** artifact (always provide `ArtifactMetadata` with `RequestFeedback: true`, `UserFacing: true`).
4. **MANDATORY STOP & YIELD TURN:**
   - Present the plan to the user in Polish.
   - Ask for explicit user approval (e.g. *"Czy akceptujesz ten plan implementacji?"*).
   - **STOP CALLING TOOLS IMMEDIATELY.** Do NOT invoke subagents, do NOT edit code files, and do NOT proceed to Phase 2 in the same turn. Wait for the user's response.

---

## Phase 2: Execution & Subagent Delegation (Only After Plan Approval)

*This phase executes ONLY after the user explicitly approves the Implementation Plan.*

Coordinate the pipeline and delegate isolated tasks to specialized subagents sequentially:

### Step 2.1: Delegate to Backend Subagent (`backend/**`)
Spawn a subagent task scoped strictly to `backend/` using the `backend-specialist` role (leveraging `@schema-sync`, `@db-migration`, `@typst-cv`, `@docker-check`, and `@test-runner`):
1. Define strict Pydantic v2 models in `backend/app/schemas/` (zero raw `dict` or `dict[str, Any]`).
2. Update SQLAlchemy/SQLModel models, autogenerate and test migrations inside Docker using `@db-migration`.
3. Implement FastAPI endpoints and services.
4. Verify Quality Gates:
   - `docker compose exec backend ruff check .`
   - `docker compose exec backend ruff format --check .`
   - `docker compose exec backend alembic upgrade head`
   - `docker compose exec backend pytest -v` (via `@test-runner`)
*Wait for Backend Subagent completion and verification before proceeding.*

### Step 2.2: Delegate to Extension Subagent (`extension/**`)
*(Skip if `ExtractedJobPayload` or scraping logic is unaffected)*
Spawn a subagent task scoped strictly to `extension/` using the `extension-specialist` role (leveraging `@extractor-test`):
1. Align DOM extractors (`extension/src/extractors/`) and `popup.js` with `backend/app/schemas/inbox.py`.
2. Ensure MV3 message passing and URL canonicalization rules are preserved.
3. Validate extractor behavior against sample job offers in `extension/example_offers/` via `@extractor-test`.

### Step 2.3: Delegate to Frontend Subagent (`frontend/**`)
Spawn a subagent task scoped strictly to `frontend/` using the `frontend-specialist` role:
1. Mirror updated Pydantic schemas 1:1 into `frontend/src/types/` (zero `any` or `Record<string, unknown>`).
2. Implement React + shadcn/ui components with Polish UI labels.
3. Verify Quality Gate:
   - `docker compose exec frontend npm run build` (must pass with zero errors).

---

## Phase 3: Review & Git Release Gate (`@git-commit`)

1. **System Consistency Check:** Verify that all changes across modules integrate seamlessly and all Docker quality gates passed.
2. **Present Summary:** Summarize completed changes, modified files, and verification statuses for the user in Polish.
3. **Ask for Git Approval:** Explicitly ask the user:
   > *"Czy zatwierdzasz te zmiany i mam wykonać commit oraz push na gałąź main?"*
4. **STOP CALLING TOOLS:** Await the user's explicit response.
5. **Execute Git Release:** Upon explicit user approval (or user-specified alternative branch), trigger `@git-commit`:
   - Inspect `git status` and `git diff --stat`.
   - Compose a structured multi-line commit message (Conventional Commits title + bulleted explanation body).
   - Commit and push to `main` (or user-specified branch).
   - Report the committed SHA and branch to the user.
