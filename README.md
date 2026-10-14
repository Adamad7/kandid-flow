# KandidFlow

> **Self-hosted recruitment management, job extraction, and AI-powered CV tailoring platform.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Backend CI](https://github.com/Adamad7/kandid-flow/actions/workflows/backend-ci.yml/badge.svg)](.github/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/Adamad7/kandid-flow/actions/workflows/frontend-ci.yml/badge.svg)](.github/workflows/frontend-ci.yml)

---

## 🚀 Overview

**KandidFlow** is a modular self-hosted platform designed to automate and streamline the IT recruitment workflow:

1. **Browser Extension (Chromium MV3):** One-click capture of job postings from Polish and international job portals (*Just Join IT*, *Pracuj.pl*, *No Fluff Jobs*, *LinkedIn*) with automated URL canonicalization, DOM noise removal, and duplicate detection.
2. **Backend & AI Engine (FastAPI / Typst / LiteLLM):** Job normalization via a resilient database-backed worker queue (`SELECT ... FOR UPDATE SKIP LOCKED`), hybrid AI model chain (local Ollama with automatic fallback to Gemini/OpenAI API), candidate knowledge base, archetype presets, and sub-50ms Typst resume rendering (multi-page vector SVG preview & binary PDF export).
3. **Web UI (React 18 / Vite / Tailwind CSS / shadcn/ui):** Polish-language interface featuring a Kanban pipeline board, interview timeline manager, candidate knowledge base, base CV presets manager, and an interactive Split-View CV editor with inline AI section refinement and version switcher.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│             Chromium Extension (Manifest v3)           │
│   [Content Extractors] ──▶ [Popup / Service Worker]    │
└───────────────────────────┬────────────────────────────┘
                            │ POST /api/v1/inbox (API Token Auth)
                            ▼
┌────────────────────────────────────────────────────────┐
│            KandidFlow Backend (FastAPI Core)           │
│                                                        │
│  ┌───────────────────┐        ┌─────────────────────┐  │
│  │ Ingestion & DB    │───────▶│ LLM Orchestrator    │  │
│  │ Queue Worker      │        │ (LiteLLM / Fallback)│  │
│  └─────────┬─────────┘        └──────────┬──────────┘  │
│            │                             │             │
│            ▼                             ▼             │
│  ┌───────────────────┐        ┌─────────────────────┐  │
│  │ PostgreSQL DB     │        │ Typst Engine        │  │
│  │ (Relational+JSONB)│        │ (.typ ─▶ SVGs / PDF)│  │
│  └─────────▲─────────┘        └──────────┬──────────┘  │
│            │                             │             │
└────────────┼─────────────────────────────┼─────────────┘
             │ REST API                    │ SVG[] / PDF
             ▼                             ▼
┌────────────────────────────────────────────────────────┐
│             Web UI (React + Vite + shadcn/ui)          │
│   [Kanban Board] ── [Split-View Live CV] ── [Profile]  │
│   [Events Timeline] ── [Base CV Presets Manager]       │
└────────────────────────────────────────────────────────┘
```

---

## ⚠️ Inviolable Rules (Multi-Agent & Developer Guidelines)

- **Docker-Only Execution (NEVER Run on Host):**  
  Do **NOT** run dev servers, package managers, or linters directly on the host machine (`npm`, `pip`, `ruff`, `tsc`, `alembic` on host are forbidden). All commands, tests, and builds must be run inside Docker containers via `docker compose exec` or `docker compose run --rm`.
- **Schema-First & Zero Raw Dicts for JSONB:**  
  All database JSONB fields (`raw_payload`, `structured_data`, `contact_info`, `sections`, `layout_schema`) must have strict, nested Pydantic v2 schemas mirrored 1:1 in TypeScript (no `dict[str, Any]` or `any`).
- **English Codebase & Polish UI:**  
  All code, comments, documentation, and database schemas are in English. User-facing UI labels, placeholders, and default CV templates are in Polish.
- **No Secrets in Repo:**  
  API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) and tokens (`EXTENSION_API_TOKEN`) are configured strictly via `.env` and loaded through Pydantic `BaseSettings`.

---

## ⚡ Quick Start

### 1. Prerequisites
- Docker Engine 24.0+ & Docker Compose v2.20+
- Chromium-based browser (Chrome, Brave, Edge) for the browser extension

### 2. Configure Environment
Clone the repository and copy the environment template:
```bash
cp .env.example .env
```
Edit `.env` to configure your API keys (`GEMINI_API_KEY` or `OPENAI_API_KEY`) and customize port mappings if needed.

### 3. Start Containers
```bash
docker compose up -d
```

### 4. Apply Database Migrations
```bash
docker compose exec backend alembic upgrade head
```

### 5. (Optional) Seed Sample Development Data
```bash
docker compose exec backend python scripts/seed_dev.py
```

### 6. Access the Application
- **Frontend Web UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)

---

## 🧩 Browser Extension Setup

1. Open your Chromium browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in top right corner).
3. Click **Load unpacked** and select the `extension/` directory from this repository.
4. Open the extension popup, click the **Settings** gear icon, and configure:
   - **Backend Server URL:** `http://localhost:8000` (or your remote Cloudflare Tunnel URL)
   - **API Token:** Value of `EXTENSION_API_TOKEN` configured in `.env`
5. Navigate to any supported job portal (*Just Join IT*, *Pracuj.pl*, *No Fluff Jobs*, *LinkedIn*) and click **Zapisz ofertę**.

---

## 🧪 Quality Gates & CI Checks (Docker-Only)

All quality checks must execute cleanly inside Docker containers:

### Backend Linter & Formatting
```bash
docker compose exec backend ruff check .
docker compose exec backend ruff format --check .
```

### Backend Automated Tests
```bash
docker compose exec backend pytest
```

### Frontend TypeScript & Vite Production Build
```bash
docker compose exec frontend npm run build
```

---

## 📄 License

This project is licensed under the terms of the **GNU Affero General Public License v3.0 (AGPLv3)**. See [LICENSE](LICENSE) for details.
