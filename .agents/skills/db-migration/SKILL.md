---
name: db-migration
description: Generate, inspect, test, and apply PostgreSQL database migrations using Alembic strictly inside Docker containers. Use when modifying SQLModel/SQLAlchemy models in backend/app/models/.
---

# Database Migration Skill (Alembic in Docker)

All Alembic operations MUST be run inside the `backend` Docker container. Never run `alembic` on the host machine.

## 1. Migration Lifecycle Workflow

### Step 1: Update Database Models
Modify the SQLModel / SQLAlchemy models in `backend/app/models/`. Ensure all new models and tables are imported in `backend/alembic/env.py` (via `app.models`).

### Step 2: Autogenerate Migration Revision
Run inside the backend container with a clear, descriptive migration message:
```bash
docker compose exec backend alembic revision --autogenerate -m "add_recruitment_events_table"
```

### Step 3: Inspect the Generated Migration File
Open the newly generated migration file in `backend/alembic/versions/<revision>_<message>.py` and review:
1. **JSONB Types:** Verify that JSONB columns use `postgresql.JSONB(astext_type=sa.Text())`.
2. **Server Defaults:** Confirm UUID defaults (`sa.text('gen_random_uuid()')`) and timestamps (`sa.text('NOW()')`).
3. **Foreign Keys:** Ensure `ON DELETE CASCADE` or `ON DELETE SET NULL` match specifications.
4. **Reversibility (`downgrade()`):** Ensure the `downgrade()` function accurately reverts all operations made in `upgrade()`.

### Step 4: Apply Migration
```bash
docker compose exec backend alembic upgrade head
```

### Step 5: Verify Reversibility (Rollback Test)
Confirm the migration can be safely rolled back and re-applied without data corruption:
```bash
# Rollback one revision
docker compose exec backend alembic downgrade -1

# Re-apply to head
docker compose exec backend alembic upgrade head
```

### Step 6: Check Database Status
```bash
docker compose exec backend alembic current
```
