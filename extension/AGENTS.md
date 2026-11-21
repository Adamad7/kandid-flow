# Extension & Scraping Specialist Rules

## Scope & Boundaries
- **Allowed Scope:** `extension/`.
- **Forbidden Scope:** Do not modify `backend/` or `frontend/`. Read `backend/app/schemas/inbox.py` as the read-only source of truth for outgoing payloads.

## Tech Stack & Architecture
- **Stack:** Chromium Extension Manifest v3, Vanilla JavaScript, CSS (zero bundlers/npm).
- **Contract Alignment:** Outgoing payloads must strictly match `ExtractedJobPayload` in `backend/app/schemas/inbox.py`.
- **MV3 Security & CORS Separation:**
  - `src/content.js` & `src/extractors/*.js`: Run in page context ONLY to inspect DOM, canonicalize URLs (strip tracking params), and respond to `chrome.runtime.onMessage`. Zero network requests (`fetch`, `XMLHttpRequest`, `WebSocket`).
  - `popup.js` / `src/background.js`: Execute all HTTP calls (`GET /api/v1/inbox/check` and `POST /api/v1/inbox`) using `server_url` and `api_token` from `chrome.storage.local`.
- **Extractors (Strategy Pattern in `extension/src/extractors/`):**
  - Portal-specific strategy modules (e.g. `justjoin.js`, `pracuj.js`, `nofluffjobs.js`, `linkedin.js`, `theprotocol.js`) registered in `src/content.js` and `manifest.json`.
  - `fallback.js`: Sanitizing fallback stripping `script`, `style`, `nav`, `footer`, and cookie banners to extract `<main>` or `<article>`.
- **Popup UI:** Polish UI labels ("Zapisz ofertę"), duplicate warning indicator, custom note input, and settings view.

## Quality Gates & Skills
- **Skill:** Leverage `@extractor-test` when debugging, modifying, or adding DOM extraction strategies.
- **Verification:** Run `.agents/skills/extractor-test/scripts/check_extractors.py` and validate against HTML snapshot fixtures in `extension/example_offers/` before completing any task. Ensure zero network requests from content scripts.
