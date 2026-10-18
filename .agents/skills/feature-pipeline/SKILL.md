---
name: feature-pipeline
description: Master Orchestrator skill to analyze requirements, update architecture plans, and coordinate delegation to specialized Backend, Extension, and Frontend subagents.
---

# Master Orchestrator & Subagent Delegation Pipeline

Use this skill when implementing new features, major refactorings, or cross-module bug fixes. As the **Lead Orchestrator**, do NOT write code across all modules in a single monolithic pass. Instead, coordinate the pipeline and delegate isolated subagent tasks sequentially:

## Step 1: Impact Analysis & Planning (Lead Orchestrator)
1. Read `SPECIFICATION.md` and analyze the user's request.
2. If database schema, JSONB structure, or API contracts change, generate an **Implementation Plan** artifact and update `SPECIFICATION.md`.
3. Present the plan to the user and obtain alignment before modifying code.
4. Prepare task specifications for subagents.

## Step 2: Delegate to Backend Subagent (`backend/**`)
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

## Step 3: Delegate to Extension Subagent (`extension/**`)
*(Skip if `ExtractedJobPayload` or scraping logic is unaffected)*
Spawn a subagent task scoped strictly to `extension/` using the `extension-specialist` role (leveraging `@extractor-test`):
1. Align DOM extractors (`extension/src/extractors/`) and `popup.js` with `backend/app/schemas/inbox.py`.
2. Ensure MV3 message passing and URL canonicalization rules are preserved.
3. Validate extractor behavior against sample job offers in `extension/example_offers/` via `@extractor-test`.


## Step 4: Delegate to Frontend Subagent (`frontend/**`)
Spawn a subagent task scoped strictly to `frontend/` using the `frontend-specialist` role:
1. Mirror updated Pydantic schemas 1:1 into `frontend/src/types/` (zero `any` or `Record<string, unknown>`).
2. Implement React + shadcn/ui components with Polish UI labels.
3. Verify Quality Gate:
   - `docker compose exec frontend npm run build` (must pass with zero errors).

## Step 5: Final Review & User Summary (Lead Orchestrator)
1. Verify whole-system consistency across all modules.
2. Summarize completed changes, updated files, and verification statuses for the user.

## Step 6: User Acceptance & Git Release (`@git-commit`)
1. Await explicit approval from the user confirming the feature works as expected or the bug is resolved.
2. Upon approval, trigger `@git-commit`:
   - Inspect `git status` and `git diff --stat`.
   - Compose a structured multi-line commit message (Conventional Commits title + bulleted explanation body).
   - Commit and push to `main` (or user-specified branch).
   - Report the committed SHA and branch to the user.

