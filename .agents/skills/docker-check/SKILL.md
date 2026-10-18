---
name: docker-check
description: Run linters, type checks, database migrations, and container rebuilds strictly inside Docker containers. Use before finishing any coding task or when adding dependencies.
---

# Docker Quality Gates & Execution Skill

Host execution of dev tools is strictly prohibited. Always use these exact commands:

## 1. Backend Checks
```bash
# Lint & Format check
docker compose exec backend ruff check .
docker compose exec backend ruff format --check .

# Auto-fix lint/format issues if needed
docker compose exec backend ruff check --fix .
docker compose exec backend ruff format .

# Apply database migrations
docker compose exec backend alembic upgrade head
```

## 2. Frontend Checks
```bash
# TypeScript compilation & Vite production bundle check
docker compose exec frontend npm run build
```

## 3. Adding Dependencies & Rebuilding
Edit backend/pyproject.toml or frontend/package.json directly.

Rebuild and restart the specific container:

```bash
docker compose build <backend|frontend>
docker compose up -d <backend|frontend>
```