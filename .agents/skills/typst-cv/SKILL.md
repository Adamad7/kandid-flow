---
name: typst-cv
description: Maintain and compile the Typst CV template (cv_base.typ) into multi-page vector SVG arrays for live preview and PDF streams for export. Use when working on CV rendering, layout schemas, or Typst compiler services.
---

# Typst CV Compilation Skill

## Architecture Requirements
1. **Template Location:** `backend/app/templates/cv_base.typ`
   - Must remain a clean, single-column, ATS-optimized layout.
   - Iterates dynamically over blocks defined in `CVLayoutSchema` (`backend/app/schemas/cv.py`).
   - Supports both Polish (`pl`) and English (`en`) section headers based on `language`.
2. **Compiler Service:** `backend/app/services/typst_compiler.py`
   - Uses the official Rust-backed `typst` Python package inside the `backend` container.
   - **Live Preview Output:** Must return `list[str]` (JSON array of vector `SVG` strings, one string per rendered page) to enable sub-50ms multi-page preview in the React Split-View editor.
   - **Export Output:** Must return a binary `PDF` stream with selectable text and clickable links.

## Verification (Docker-Only)
Run the dedicated Typst compiler test suite inside the `backend` container to verify SVG page rendering, `%PDF-` binary output, and bilingual layout handling:
```bash
docker compose exec backend pytest tests/test_typst_compiler.py -v
```
