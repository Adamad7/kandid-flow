---
name: extractor-test
description: Validate and debug Chromium extension DOM extractors against sample portal HTML snapshots in extension/example_offers/. Use when portal DOM structures change, new portals are added, or extraction fails.
---

# Extension DOM Extractor Testing & Validation Skill

Use this skill when developing, refactoring, or fixing portal extractors in `extension/src/extractors/`.

## 1. Authoritative Sources
- **Extractor Strategies:** `extension/src/extractors/` (one module per portal plus `fallback.js`), orchestrated by `extension/src/content.js` and declared in `extension/manifest.json`.
- **HTML Regression Fixtures:** `extension/example_offers/` (named `<portal>_*.html`). When a portal alters its DOM layout, save a fresh HTML snapshot here as a regression benchmark.
- **Payload Contract (Single Source of Truth):** Always inspect `ExtractedJobPayload` and `ExtractorDiagnosticMetadata` directly in `backend/app/schemas/inbox.py`. Do not rely on duplicated schema copies.

## 2. Automated Verification Script
Run the bundled static & registration checker (uses Python stdlib only — zero host packages):
```bash
python3 .agents/skills/extractor-test/scripts/check_extractors.py
```
This verifies:
1. `extension/manifest.json` is valid JSON and all declared content scripts exist on disk.
2. Every extractor in `extension/src/extractors/` (besides `fallback.js`) is wired into both `extension/manifest.json` and `extension/src/content.js`.
3. Zero forbidden network APIs (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`) appear in `extension/src/content.js` or `extension/src/extractors/*.js`.
4. Available HTML regression fixtures in `extension/example_offers/` are reported per portal.

### Validate an Extracted JSON Payload Against Pydantic (Docker-Only)
When verifying a sample JSON payload emitted by an extractor, validate it directly against `ExtractedJobPayload` inside the `backend` container:
```bash
docker compose exec -T backend python -c "import sys, json; from app.schemas.inbox import ExtractedJobPayload; ExtractedJobPayload.model_validate(json.load(sys.stdin)); print('ExtractedJobPayload valid OK')" < payload.json
```

## 3. Quality Rules for Extractors
1. **URL Canonicalization:** Strip query tracking parameters (`utm_*`, `searchId`, `trackingId`, `refId`, `trackingCode`, `spm`) via `window.KandidFlow.utils`.
2. **Noise Removal:** Strip `<script>`, `<style>`, `<nav>`, `<footer>`, cookie consent banners, and social widgets before extracting text.
3. **Resilience:** Prefer `application/ld+json` (`JobPosting`), `data-test*`, semantic tags (`<article>`, `<main>`), and ARIA labels over brittle generated CSS hash classes.
4. **Pure Vanilla JS:** Zero npm dependencies or bundlers; remain strictly Chrome Manifest v3 compliant.
