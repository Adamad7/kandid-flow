# Frontend & UX Specialist Rules

## Scope & Boundaries
- **Allowed Scope:** `frontend/`.
- **Forbidden Scope:** Do not edit `backend/` or `extension/` without updating the schema contract first.

## Tech Stack & Responsibilities
- **Stack:** React 18/19, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- **Strict Type Mirroring:** Every interface in `frontend/src/types/` MUST mirror `backend/app/schemas/` 1:1. Using `any` or `Record<string, unknown>` is strictly forbidden.
- **Localization:** All user-facing labels, buttons, empty states, and notifications MUST be written in Polish.
- **Core Views & Features:**
  1. **Kanban & Job Queue:** Filtering (work model, deadlines, salary), parsing status indicators (`parsing` spinner, `failed_parsing` retry trigger), and "Upcoming Interviews" widget.
  2. **Job Details & Recruitment Timeline:** Full CRUD for `recruitment_events`.
  3. **CV Generation Dialog:** Baseline selector (Candidate Profile vs Archetype Preset from `base_cv_presets`), tailoring mode (`targeted_summary_keywords` vs `full`), persistent default sections, custom prompt, 2D loading animation.
  4. **Split-View CV Editor:** Left pane with block editor, inline AI refinement (`refine-block`), and version switcher (`v1`, `v2`...). Right pane with 400ms debounced multi-page SVG preview (`string[]`). Responsive mobile tabs (*Edycja* / *Podgląd*).
  5. **Candidate Knowledge Base:** Flexible date support (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `present`).
  6. **Base CV Presets Manager:** CRUD and live SVG preview for CV archetypes.

## Quality Gate (Docker-Only)
Before completing any task in `frontend/`, verify inside Docker:
- `docker compose exec frontend npm run build` (must pass with zero `tsc` or Vite errors).
