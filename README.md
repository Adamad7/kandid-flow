# KandidFlow

> **Self-hosted recruitment management, job extraction, and AI-powered CV tailoring platform.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Backend CI](https://github.com/Adamad7/kandid-flow/actions/workflows/backend-ci.yml/badge.svg)](.github/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/Adamad7/kandid-flow/actions/workflows/frontend-ci.yml/badge.svg)](.github/workflows/frontend-ci.yml)

---

## 🚀 Overview

**KandidFlow** is a modern, privacy-first, self-hosted platform engineered to automate and streamline the entire IT recruitment lifecycle. It eliminates tedious manual job tracking, repetitive copy-pasting, and document formatting overhead by unifying:

- **Browser-based job capture** with automated noise cleaning and duplicate detection.
- **Asynchronous, hybrid AI normalization** of job requirements and technical stacks.
- **End-to-end recruitment pipeline management** with a visual Kanban board and interview timeline tracker.
- **Knowledge-driven, tailored CV generation** powered by strict data schemas, inline AI refinement, and instant vector/PDF rendering via Typst.

---

## ✨ Key Features & Capabilities

### 1. 🧩 One-Click Job Capture (Chromium MV3 Extension)
- **Strategy-Pattern Extractors:** Dedicated DOM extractors for leading job boards (*Just Join IT*, *Pracuj.pl*, *No Fluff Jobs*, *LinkedIn*) plus a robust generic fallback extractor.
- **Automated URL Canonicalization:** Strips tracking parameters (`utm_*`, `searchId`, tokens) to ensure clean source references.
- **Real-Time Duplicate Detection:** Instantly notifies you in the popup if an offer from the active URL already exists in your database.
- **Zero-Friction Ingestion:** Cleanly strips page noise (cookie banners, corporate footers, navigation widgets) and sends structured payloads directly to your self-hosted backend via secure API token authorization.

### 2. ⚡ Resilient AI Ingestion & Queue Worker
- **Database-Backed Queue:** Background worker loop utilizing PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` guarantees reliable, crash-resilient asynchronous parsing.
- **Hybrid LLM Orchestrator:** Intelligent fallback chain running locally on **Ollama** (e.g., Qwen 2.5) with automatic failover to cloud LLMs (**Google Gemini 2.5 Flash** or **OpenAI**) in case of timeouts or connection issues.
- **Strictly Typed Structured Outputs:** Powered by Pydantic v2 schemas and JSON Schema validation to eliminate model hallucinations, extracting:
  - Must-have and nice-to-have skill requirements
  - Technology stack categorizations
  - Work model (remote, hybrid, onsite) and detailed location arrays
  - Normalized salary brackets and contract types (B2B, UoP)
- **Manual Retry Mechanism:** One-click re-parse capabilities for any failed ingestion jobs directly from the UI.

### 3. 📋 Recruitment Pipeline & Kanban Board
- **Visual Status Workflow:** Track progress across customizable recruitment stages:
  `Inbox` ➔ `Parsing` ➔ `Ready` ➔ `Applied` ➔ `Interview` ➔ `Offer` / `Rejected`.
- **Smart Cards & Indicators:** Displays salary badges, workplace model indicators, application deadline countdown timers, and live parsing status indicators.
- **Search & Filtering:** Quickly organize opportunities by company, role title, skills, or pipeline status.

### 4. 📅 Interview Timeline & Recruitment Events Tracker
- **Stage Scheduling:** Plan and manage upcoming recruitment milestones linked directly to each application:
  - HR Screenings
  - Technical Interviews & Live Coding
  - Homework Task Deadlines
  - Manager & Final Interviews
- **Meeting Organization:** Store Google Meet / Teams links, interviewer names, and preparation notes.
- **Dashboard Highlights:** Dedicated "Upcoming Interviews" widget on the pipeline view ensures you never miss a deadline or interview stage.

### 5. 🧠 Candidate Knowledge Base & Archetype Presets
- **Modular Knowledge Base:** Maintain a single source of truth for your professional journey, including structured blocks for work experience, education, certifications, portfolio projects, and technical skills.
- **Flexible Date Expressions:** First-class support for diverse date resolutions (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `present`).
- **Role Archetype Presets:** Create and manage baseline templates (e.g., *"Full-Stack Engineer"*, *"DevOps / Cloud Specialist"*, *"Mobile Developer"*) as reusable starting points for rapid application generation.

### 6. 🎯 AI-Powered CV Tailoring & Version Control
- **Dual Tailoring Modes:**
  - *Targeted Summary & Keywords:* Optimizes the professional summary and skill tags for ATS match while keeping standard history intact.
  - *Full Tailoring:* Comprehensively re-weights bullet points and project highlights to align precisely with the job's must-have requirements.
- **Inline AI Block Refinement:** Highlight any section inside the editor to request instant AI modifications (*"Shorten summary"*, *"Shift emphasis towards Kubernetes and CI/CD"*, *"Emphasize leadership experience"*).
- **Immutable Version History:** Each generation automatically creates a versioned record (`v1`, `v2`, ...) with change summaries, allowing you to compare and roll back modifications at any time.

### 7. 🏎️ Sub-50ms Typst Resume Engine (Split-View Workspace)
- **Rust-Powered Typst Compilation:** Generates clean, single-column, ATS-optimized resumes with modern typography.
- **Live Debounced Multi-Page SVG Preview:** Split-view editor renders vector SVG pages in real time with sub-50ms updates as you type or apply AI refinements.
- **Pixel-Perfect PDF Export:** Download crisp, binary PDF files with selectable text and clickable links on demand.
- **Mobile-Responsive Editing:** Adaptive view with seamless tab switching between structured editing and full-screen document preview.

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

## 🤖 Agentic Software Engineering Workflow

KandidFlow was designed and built utilizing **Agentic Software Engineering** principles, coordinating autonomous specialized AI subagents within a disciplined development framework:

- **Lead Orchestrator:** Oversees architecture evolution, approves implementation plans, and enforces cross-system boundaries.
- **Domain Specialists:**
  - `backend-specialist`: FastAPI, SQLAlchemy/SQLModel, Alembic migrations, LiteLLM integrations, and Typst compilation services.
  - `frontend-specialist`: React, TypeScript 1:1 schema mirroring, Tailwind CSS, shadcn/ui, and reactive split-view components.
  - `extension-specialist`: Chromium Manifest v3 extractors, DOM sanitation, and extension UI.
- **Strict Quality Gates:** Every code modification is automatically validated through isolated Docker container checks (`ruff`, `pytest`, `npm run build`) before release.

---

## ⚠️ Inviolable Development Rules

- **Docker-Only Execution (NEVER Run on Host):**  
  Do **NOT** run dev servers, package managers, or linters directly on the host machine (`npm`, `pip`, `ruff`, `tsc`, `alembic` on host are forbidden). All commands, tests, and builds must execute inside Docker containers via `docker compose exec` or `docker compose run --rm`.
- **Schema-First & Zero Raw Dicts for JSONB:**  
  All PostgreSQL JSONB columns (`raw_payload`, `structured_data`, `contact_info`, `sections`, `layout_schema`) require strict, nested Pydantic v2 schemas mirrored 1:1 in TypeScript (raw `dict` or `any` are forbidden).
- **English Codebase & Polish UI:**  
  All code, comments, documentation, and database schemas are in English. User-facing web UI labels, extension screens, and default CV templates are in Polish.
- **Zero Secrets in Repository:**  
  API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) and tokens (`EXTENSION_API_TOKEN`) are injected strictly through `.env` and loaded via Pydantic `BaseSettings`.

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
