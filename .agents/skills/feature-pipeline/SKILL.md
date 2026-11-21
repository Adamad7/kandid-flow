---
name: feature-pipeline
description: Master Orchestrator skill to analyze requirements, update architecture plans, and coordinate delegation to specialized Backend, Extension, and Frontend subagents.
---

# Master Orchestrator & Subagent Delegation Pipeline

Use this skill for **Full Pipeline** work (new features, database/schema/JSONB/API contract changes, multi-module features, or architectural refactors). Small, isolated single-module fixes may use the **Fast Track** defined in `AGENTS.md`.

---

## Phase 1: Impact Analysis & Planning Gate (MANDATORY STOP)

1. Read `SPECIFICATION.md` and analyze the user's request.
2. If database schema, JSONB structure, or API contracts change, design the architecture update and plan any `SPECIFICATION.md` updates.
3. Generate an **Implementation Plan** artifact (`ArtifactMetadata` with `RequestFeedback: true`, `UserFacing: true`).
4. **MANDATORY STOP & YIELD TURN:**
   - Present the plan to the user in Polish.
   - Ask for explicit approval (e.g. *"Czy akceptujesz ten plan implementacji?"*).
   - **STOP CALLING TOOLS IMMEDIATELY.** Do not invoke subagents or edit code until the user approves.

---

## Phase 2: Execution & Subagent Delegation (Only After Plan Approval)

### Subagent Brief Checklist
Because subagents start with a fresh context, every `invoke_subagent` prompt MUST include:
- **Goal & Scope:** Exact objective and allowed directory (`backend/`, `extension/`, or `frontend/`).
- **Authoritative Files & Diffs:** Relevant file paths and exact schema/contract diffs from upstream steps.
- **Acceptance Criteria:** Concrete expected behavior and edge cases.
- **Verification Commands:** The exact Docker quality gate commands the specialist must run and report.

### Step 2.1: Backend Subagent (`backend/**`)
Delegate to `backend-specialist` (skills: `@schema-sync` Phase A, `@db-migration`, `@typst-cv`, `@docker-check`, `@test-runner`):
1. Define strict nested Pydantic v2 models in `backend/app/schemas/` (zero raw `dict` or `dict[str, Any]`).
2. Update SQLAlchemy/SQLModel models and generate/test Alembic migrations inside Docker (`@db-migration`).
3. Implement FastAPI endpoints and services.
4. Verify all Docker Quality Gates (`ruff check`, `ruff format --check`, `alembic upgrade head`, `pytest -v`) and return the exact schema diff.

*Wait for `backend-specialist` completion and verification before starting dependent modules.*

### Step 2.2: Extension (`extension/**`) & Frontend (`frontend/**`) — Parallelizable
Once backend schema contracts are finalized, `extension-specialist` (if `ExtractedJobPayload` or scraping is affected) and `frontend-specialist` are independent and **may be invoked in parallel**:

- **`extension-specialist`** (skill: `@extractor-test`):
  1. Align `extension/src/extractors/` and `popup.js` with `backend/app/schemas/inbox.py`.
  2. Preserve MV3 security separation (zero network calls in content scripts) and URL canonicalization.
  3. Run `python3 .agents/skills/extractor-test/scripts/check_extractors.py` and verify fixtures in `extension/example_offers/`.

- **`frontend-specialist`** (skills: `@schema-sync` Phase B, `@docker-check`, `@ui-test-page`):
  1. Mirror updated Pydantic schemas 1:1 into `frontend/src/types/` (zero `any` or `Record<string, unknown>`).
  2. Implement React + shadcn/ui components with Polish UI labels and Light/Dark theme parity (`frontend/AGENTS.md`).
  3. Verify Docker Quality Gates:
     - `docker compose exec frontend npm run lint`
     - `docker compose exec frontend npm run build`

### Error & Recovery Protocol
- **Container Not Running:** If `docker compose exec` fails because a container is stopped, run `docker compose ps` and `docker compose up -d`, then retry.
- **Quality Gate Failure:** Never ignore or bypass a failing lint, type, migration, or test gate. Send the error output back to the responsible subagent (`send_message`) to fix and re-verify before proceeding to Phase 3.

---

## Phase 3: Review & Git Release Gate (Interactive Modal & `@git-commit`)

1. **System Consistency Check:** Confirm cross-module alignment and that all Docker quality gates passed.
2. **Present Summary:** Summarize changes, modified files, and verification results in Polish.
3. **Interactive Git Approval Modal:** Invoke `ask_question` with:
   - `question`: *"Wszystkie zmiany zostały zweryfikowane. Co chcesz zrobić z wprowadzonymi zmianami?"*
   - `options`:
     - `(Recommended) Tak, wykonaj commit i push na gałąź main`
     - `Wypchnij na inną gałąź (podam nazwę w odpowiedzi)`
     - `Pomiń commit (pozostaw zmiany robocze lokalnie)`
4. **Execute Git Release:**
   - **Option 1:** Invoke `@git-commit` to commit and push to `origin main`.
   - **Option 2:** Checkout/create the user-specified branch and invoke `@git-commit` to push there.
   - **Option 3:** Conclude without committing, leaving working tree changes intact.
