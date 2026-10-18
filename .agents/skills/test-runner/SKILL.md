---
name: test-runner
description: Run backend pytest test suites, endpoint verifications, and Typst compilation tests strictly inside Docker containers. Use whenever modifying backend code, services, or before submitting backend changes.
---

# Backend Pytest Test Runner Skill

All tests MUST run strictly inside the backend Docker container. Host execution (`pytest`) is strictly forbidden.

## 1. Test Execution Commands

### Run Entire Backend Test Suite
```bash
docker compose exec backend pytest -v
```

### Run Specific Test Files
```bash
# REST API endpoints & inbox pipeline
docker compose exec backend pytest tests/test_api_endpoints.py -v

# Typst compiler, SVG array output, and PDF binary stream
docker compose exec backend pytest tests/test_typst_compiler.py -v

# Base CV presets & AI tailoring logic
docker compose exec backend pytest tests/test_presets_and_tailoring.py -v

# Spec v1.1 features (recruitment events, candidate knowledge base, settings)
docker compose exec backend pytest tests/test_spec_v1_1_features.py -v
```

### Filter Tests by Keyword or Fail-Fast
```bash
# Run specific test function
docker compose exec backend pytest -k "test_reparse" -v

# Stop immediately on first test failure
docker compose exec backend pytest -x -v
```

## 2. Test Architecture Guidelines
- **Database Isolation:** Database sessions are overridden in `conftest.py` using `NullPool` and `override_get_db_session` to prevent cross-event-loop connection pooling issues.
- **Async HTTP Client:** Use the `async_client: httpx.AsyncClient` fixture for calling FastAPI endpoints.
- **LLM Mocking:** External LLM calls (Ollama / Gemini / OpenAI) must be mocked or intercepted in unit tests so that test execution remains hermetic and deterministic without network dependency.
- **Typst Assertions:** When testing `typst_compiler`, assert that SVG output is a `list[str]` with valid `<svg ...>` root tags, and PDF output begins with the `%PDF-` magic header.
