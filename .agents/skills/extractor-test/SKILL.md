---
name: extractor-test
description: Validate and debug Chromium extension DOM extractors against sample portal HTML snapshots in extension/example_offers/. Use when portal DOM structures change, new portals are added, or extraction fails.
---

# Extension DOM Extractor Testing & Validation Skill

Use this skill when developing, refactoring, or fixing portal extractors (`extension/src/extractors/`).

## 1. Extractors Architecture
The extension uses the Strategy Pattern to extract job data without running network calls in the page context:
- `extension/src/extractors/justjoin.js` (Just Join IT)
- `extension/src/extractors/pracuj.js` (Pracuj.pl)
- `extension/src/extractors/nofluffjobs.js` (No Fluff Jobs)
- `extension/src/extractors/linkedin.js` (LinkedIn Jobs)
- `extension/src/extractors/fallback.js` (Sanitizing fallback for any job board)

## 2. Test Fixtures in `extension/example_offers/`
Real-world HTML snapshots are maintained to test against regressions:
- `justjoin_*.html`
- `pracuj_*.html`

When a portal alters its DOM layout, save the new HTML snapshot into `extension/example_offers/` to debug and keep as a regression benchmark.

## 3. Extractor Payload Contract Validation
Every extractor output MUST strictly align with `ExtractedJobPayload` in `backend/app/schemas/inbox.py`:

```typescript
interface ExtractedJobPayload {
  source_url: string;        // Canonical URL (tracking query params stripped)
  source_portal: string;     // 'justjoin' | 'pracuj' | 'nofluffjobs' | 'linkedin' | 'generic'
  title: string;             // Job title
  company: string | null;    // Employer name
  description_text: string;  // Sanitized text of the job description
  work_model?: string | null;// 'remote' | 'hybrid' | 'onsite'
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;  // e.g. 'PLN', 'EUR', 'USD'
  locations?: string[];      // Array of city/location names
  raw_metadata?: Record<string, string>;
}
```

## 4. Quality Rules for Extractors
1. **URL Canonicalization:** Always strip query tracking parameters (`utm_*`, `searchId`, `trackingId`, `refId`, `trackingCode`, `spm`).
2. **Noise Removal:** Extractors (and especially `fallback.js`) must strip `<script>`, `<style>`, `<nav>`, `<footer>`, cookie consent banners, and social sharing widgets before extracting text.
3. **Resilience:** Use resilient selectors (prefer `data-test`, semantic tags `<article>`, `<main>`, aria labels, and fallback hierarchy over brittle auto-generated CSS hash classes).
4. **No NPM/Node Modules:** Keep all extension code pure Vanilla JavaScript compatible with Chrome Manifest v3.
