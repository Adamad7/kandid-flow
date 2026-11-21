#!/usr/bin/env python3
"""Static & registration validator for KandidFlow Chrome Extension extractors.

Uses Python standard library only (no host dev dependencies required).
Checks:
1. extension/manifest.json validity and existence of all declared scripts.
2. Every extractor in extension/src/extractors/ (except fallback.js) is registered
   in both manifest.json and extension/src/content.js.
3. Zero network calls (fetch, XMLHttpRequest, WebSocket, sendBeacon) in content
   scripts and extractors (MV3 CORS & security separation rule).
4. Maps HTML regression fixtures in extension/example_offers/ per portal.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

FORBIDDEN_NETWORK_PATTERNS = [
    (re.compile(r"\bfetch\s*\("), "fetch()"),
    (re.compile(r"\bXMLHttpRequest\b"), "XMLHttpRequest"),
    (re.compile(r"\bnew\s+WebSocket\b"), "WebSocket"),
    (re.compile(r"\bnavigator\.sendBeacon\s*\("), "navigator.sendBeacon()"),
]

# Strip JS line and block comments so comment mentions don't trigger false positives
JS_COMMENT_RE = re.compile(r"//[^\n]*|/\*[\s\S]*?\*/")


def find_repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in [here, *here.parents]:
        if (parent / "extension" / "manifest.json").is_file():
            return parent
    raise FileNotFoundError("Could not locate repository root containing extension/manifest.json")


def check_network_calls(js_path: Path) -> list[str]:
    text = js_path.read_text(encoding="utf-8")
    stripped = JS_COMMENT_RE.sub("", text)
    hits: list[str] = []
    for pattern, label in FORBIDDEN_NETWORK_PATTERNS:
        if pattern.search(stripped):
            hits.append(label)
    return hits


def main() -> int:
    root = find_repo_root()
    ext_dir = root / "extension"
    manifest_path = ext_dir / "manifest.json"
    content_js_path = ext_dir / "src" / "content.js"
    extractors_dir = ext_dir / "src" / "extractors"
    fixtures_dir = ext_dir / "example_offers"

    errors: list[str] = []
    warnings: list[str] = []

    # 1. Validate manifest.json
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"FAIL: extension/manifest.json is invalid JSON: {exc}")
        return 1

    manifest_js: set[str] = set()
    for cs in manifest.get("content_scripts", []):
        for rel_js in cs.get("js", []):
            manifest_js.add(rel_js)
            if not (ext_dir / rel_js).is_file():
                errors.append(f"manifest.json references missing script: extension/{rel_js}")

    # 2. Check extractors registration & MV3 network isolation
    content_js_text = content_js_path.read_text(encoding="utf-8") if content_js_path.is_file() else ""
    extractor_files = sorted(extractors_dir.glob("*.js"))
    if not extractor_files:
        errors.append("No extractor JS files found in extension/src/extractors/")

    portals: list[str] = []
    for js_file in [content_js_path, *extractor_files]:
        if not js_file.is_file():
            continue
        net_hits = check_network_calls(js_file)
        if net_hits:
            rel = js_file.relative_to(root)
            errors.append(f"Forbidden network API(s) in {rel}: {', '.join(net_hits)}")

    for ext_file in extractor_files:
        rel_in_ext = ext_file.relative_to(ext_dir).as_posix()
        portal = ext_file.stem
        if rel_in_ext not in manifest_js:
            errors.append(f"Extractor {rel_in_ext} is not listed in extension/manifest.json content_scripts")
        if portal != "fallback":
            portals.append(portal)
            if f'"{portal}"' not in content_js_text and f"'{portal}'" not in content_js_text:
                errors.append(f"Portal '{portal}' is not detected/registered in extension/src/content.js")

    # 3. Inventory regression fixtures
    fixtures = sorted(fixtures_dir.glob("*.html")) if fixtures_dir.is_dir() else []
    fixture_map: dict[str, list[str]] = {p: [] for p in portals}
    for fx in fixtures:
        prefix = fx.name.split("_", 1)[0].lower()
        fixture_map.setdefault(prefix, []).append(fx.name)

    for portal in portals:
        if not fixture_map.get(portal):
            warnings.append(f"No HTML regression fixture in extension/example_offers/ for portal '{portal}'")

    # Report
    print(f"Checked {len(extractor_files)} extractor(s): {', '.join(f.name for f in extractor_files)}")
    print(f"Found {len(fixtures)} HTML fixture(s) in extension/example_offers/:")
    for portal, files in sorted(fixture_map.items()):
        print(f"  - {portal}: {len(files)} fixture(s)")

    if warnings:
        print("\nWarnings:")
        for w in warnings:
            print(f"  WARN: {w}")

    if errors:
        print("\nErrors:")
        for e in errors:
            print(f"  FAIL: {e}")
        return 1

    print("\nOK: All extractor registration and MV3 isolation checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
