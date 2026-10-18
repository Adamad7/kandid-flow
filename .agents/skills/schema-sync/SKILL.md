---
name: schema-sync
description: Synchronize PostgreSQL models, Alembic migrations, Pydantic v2 schemas, and TypeScript 1:1 interfaces. Use when adding or modifying database fields, JSONB structures, or API payloads.
---

# Schema Synchronization Skill

When modifying data structures in KandidFlow, follow this exact sequence:

## 1. Pydantic v2 Schema First (`backend/app/schemas/`)
- Every PostgreSQL `JSONB` column (`raw_payload`, `structured_data`, `contact_info`, `sections`, `default_sections`, `layout_schema`) MUST be represented by explicit, nested Pydantic `BaseModel` classes.
- Never use `dict`, `dict[str, Any]`, or `Any`.
- For `candidate_profile.sections`, validate flexible dates (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `present`).

## 2. Database Model & Alembic Migration (`backend/app/models/` & `backend/alembic/`)
- Update the corresponding SQLAlchemy 2.0 / SQLModel definition in `backend/app/models/`.
- Generate and apply the migration strictly inside the Docker container:
  ```bash
  docker compose exec backend alembic revision --autogenerate -m "sync_schema_changes"
  docker compose exec backend alembic upgrade head
  ```

## 3. TypeScript 1:1 Mirror (frontend/src/types/)
- Locate the matching file in frontend/src/types/.
- Translate every Pydantic model field, enum, and optional union (T | null) 1:1 into TypeScript interfaces/types.
- Verify the types compile cleanly inside Docker:

```bash
docker compose exec frontend npm run build
```