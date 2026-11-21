---
name: test-runner
description: Run backend pytest test suites, endpoint verifications, and Typst compilation tests strictly inside Docker containers. Use whenever modifying backend code, services, or before submitting backend changes.
---

# Backend Pytest Test Runner Skill

All tests MUST run strictly inside the `backend` Docker container. Host execution (`pytest`) is strictly prohibited (enforced by `.agents/hooks.json`).

## 1. Test Execution Commands

### Run Entire Backend Test Suite
```bash
docker compose exec backend pytest -v
```

### Discover & Run Specific Test Files
Inspect `backend/tests/` to locate the relevant test module, then run it directly:
```bash
docker compose exec backend pytest tests/<test_module>.py -v
```

### Filter Tests by Keyword or Fail-Fast
```bash
# Run tests matching a keyword expression
docker compose exec backend pytest -k "<keyword>" -v

# Stop immediately on first test failure
docker compose exec backend pytest -x -v
```

## 2. Test Architecture Guidelines
- **Database Isolation:** Database sessions are overridden in `backend/tests/conftest.py` using `NullPool` and `override_get_db_session` to prevent cross-event-loop connection pooling issues.
- **Async HTTP Client:** Use the `async_client: httpx.AsyncClient` fixture for calling FastAPI endpoints.
- **LLM Mocking:** External LLM calls (Ollama / Gemini / OpenAI) must be mocked or intercepted in unit tests so that test execution remains hermetic and deterministic without network dependency.
- **Typst Assertions:** When testing `typst_compiler`, assert that SVG output is a `list[str]` with valid `<svg ...>` root tags, and PDF output begins with the `%PDF-` magic header.
