---
name: schema-sync
description: Synchronize PostgreSQL models, Alembic migrations, Pydantic v2 schemas, and TypeScript 1:1 interfaces across Backend and Frontend specialist boundaries. Use when adding or modifying database fields, JSONB structures, or API payloads.
---

# Schema Synchronization Skill

Schema changes span two specialist boundaries. Each specialist MUST stay strictly within its own directory scope; the Lead Orchestrator coordinates the handoff between Phase A and Phase B.

---

## Phase A — Backend Specialist (`backend/**` only)

### 1. Pydantic v2 Schema First (`backend/app/schemas/`)
- Every PostgreSQL `JSONB` column MUST be represented by explicit, nested Pydantic `BaseModel` classes.
- Never use raw `dict`, `dict[str, Any]`, or `Any`.
- For `candidate_profile.sections`, preserve flexible date validation (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `present`).

### 2. Database Model & Alembic Migration (`backend/app/models/` & `backend/alembic/`)
- Update the corresponding SQLAlchemy 2.0 / SQLModel definition in `backend/app/models/`.
- Generate, inspect, and test the migration strictly inside Docker using `@db-migration`:
  ```bash
  docker compose exec backend alembic revision --autogenerate -m "<descriptive_change>"
  docker compose exec backend alembic upgrade head
  ```
- Verify backend quality gates (`ruff check`, `ruff format --check`, `pytest -v`).

### 3. Handoff Summary to Lead Orchestrator
Report the exact modified schema files in `backend/app/schemas/` and list every added, renamed, or changed field, enum, and nullable union so the Lead Orchestrator can pass an exact diff to `frontend-specialist` (and `extension-specialist` if `inbox.py` changed).

---

## Phase B — Frontend Specialist (`frontend/**` only)

### 1. TypeScript 1:1 Mirror (`frontend/src/types/`)
- Read the updated Pydantic models in `backend/app/schemas/` as the read-only source of truth.
- Mirror every model field, literal/enum union, and optional nullable (`T | null`) 1:1 into `frontend/src/types/`.
- Never use `any` or `Record<string, unknown>`.

### 2. Verify Compilation & Lint Inside Docker
```bash
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```
