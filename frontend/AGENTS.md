# Frontend & UX Specialist Rules

## Scope & Boundaries
- **Allowed Scope:** `frontend/`.
- **Forbidden Scope:** Do not edit `backend/` or `extension/` without updating the schema contract first.

## Tech Stack & Responsibilities
- **Stack:** React 18/19, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- **Strict Type Mirroring:** Every interface in `frontend/src/types/` MUST mirror `backend/app/schemas/` 1:1. Using `any` or `Record<string, unknown>` is strictly forbidden.
- **Localization:** All user-facing labels, buttons, empty states, and notifications MUST be written in Polish.
- **Theme Support (Light & Dark Mode):** The application strictly supports both Light and Dark modes (with Dark Mode enabled by default via `useTheme`). All new and updated UI components, dialogs, inputs, and views MUST provide complete, high-contrast Tailwind `dark:` variant styling, ensuring visual harmony and zero clipping or illegible text across both themes.

## Universal UI & Theme Design Principles

1. **Borderless Dark Mode Panels & Containers:**
   - In Dark Mode, all primary panels, cards, widgets, and modal containers MUST have transparent borders (`dark:border-transparent`) instead of visible borders (`dark:border-neutral-800`).
   - Always use `dark:border-transparent` rather than `dark:border-0` to maintain exact 1px box-model geometry and eliminate layout shifts when toggling themes.
   - Dark mode visual hierarchy relies on surface elevation (`dark:bg-neutral-950` root background vs `dark:bg-neutral-900` container surface), never on harsh outlines.

2. **Zero Style Leakage & Explicit Dark States:**
   - Never rely on implicit inheritance from Light Mode. Every interactive state (`hover:`, `focus:`, `active:`, `disabled:`, toggle positions) MUST declare an explicit `dark:` variant whenever styles diverge.
   - In segmented controls, multi-position switches, or buttons, every branch (including "off" / disabled states) must explicitly define a dark background (e.g. `dark:bg-neutral-800`), strictly preventing accidental fallback to light backgrounds (`bg-white`).
   - Strictly avoid non-standard or missing Tailwind classes (e.g. do not invent classes like `w-18` or `dark:bg-neutral-850` unless defined in `tailwind.config.js`). Always use standard tokens or validated arbitrary brackets (`[value]`).

3. **Form Fields & Interactive Focus Ergonomics:**
   - In Dark Mode, form inputs (`Input`, `Textarea`, `DateInput`, `Select`) must have no visible border in their idle state (`dark:border-transparent`) on deep background (`dark:bg-neutral-950`).
   - **Background Stability:** Focused/active inputs in Dark Mode must preserve the exact same background shade as in their idle state (`dark:focus:bg-neutral-950`), never lightening on focus.
   - **Suppress Browser Outline Flash:** Always declare `outline-none focus:outline-none` directly in base input classes to eliminate the default browser focus ring (`-webkit-focus-ring-color`) during mousedown/click.
   - **Accent Glow Activation:** Active focus states in Dark Mode must be highlighted using the primary indigo accent (`dark:focus:border-indigo-500/50`, `dark:focus:ring-2 dark:focus:ring-indigo-500/40`) combined with `transition-colors`.

4. **Warm Neutral Light Mode Palette (Zero Cold Blue Tints):**
   - Application backgrounds, cards, and neutral surfaces in Light Mode must NEVER have cold, bluish undertones (avoid cold `#f8fafc` slate-blue tints).
   - Use warm, neutral whites (`#faf9f7`, `stone-50`, `--background: 40 20% 98.5%`) that provide warmth, visual comfort, and softness without drifting into yellow or ecru (`#f5f5dc`).

5. **Subdued Dark Mode Hover Contrasts:**
   - Interactive item/row hover states in Dark Mode must remain subtle and understated (`dark:hover:bg-neutral-800/35`), avoiding sudden stark gray flashes against dark backgrounds.
   - Supplementary bars, pagination strips, and footers must visually harmonize in shade and opacity with their respective section/table headers (e.g. `dark:bg-neutral-800/80`).

## Core Views & Features:
  1. **Kanban & Job Queue:** Filtering (work model, deadlines, salary), parsing status indicators (`parsing` spinner, `failed_parsing` retry trigger), and "Upcoming Interviews" widget.
  2. **Job Details & Recruitment Timeline:** Full CRUD for `recruitment_events`.
  3. **CV Generation Dialog:** Baseline selector (Candidate Profile vs Archetype Preset from `base_cv_presets`), tailoring mode (`targeted_summary_keywords` vs `full`), persistent default sections, custom prompt, 2D loading animation.
  4. **Split-View CV Editor:** Left pane with block editor, inline AI refinement (`refine-block`), and version switcher (`v1`, `v2`...). Right pane with 400ms debounced multi-page SVG preview (`string[]`). Responsive mobile tabs (*Edycja* / *Podgląd*).
  5. **Candidate Knowledge Base:** Flexible date support (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `present`).
  6. **Base CV Presets Manager:** CRUD and live SVG preview for CV archetypes.

## Quality Gate (Docker-Only)
Before completing any task in `frontend/`, verify inside Docker:
- `docker compose exec frontend npm run build` (must pass with zero `tsc` or Vite errors).
