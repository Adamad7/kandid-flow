#!/usr/bin/env python3
"""Antigravity PreToolUse hook enforcing KandidFlow's Docker-only execution rule.

Reads the PreToolUse JSON payload from stdin and writes a decision JSON object
to stdout. Blocks direct host execution of Python/Node/dev binaries that must
run inside Docker containers (`docker compose exec` / `docker compose run`).
"""

from __future__ import annotations

import json
import os
import re
import shlex
import sys

FORBIDDEN_HOST_BINARIES = frozenset(
    {
        "pip",
        "pip3",
        "uv",
        "poetry",
        "npm",
        "npx",
        "yarn",
        "pnpm",
        "ruff",
        "tsc",
        "alembic",
        "pytest",
        "uvicorn",
        "vite",
    }
)

ENV_ASSIGN_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=.*$")
CHAIN_DELIMITERS = {"&&", "||", ";", "|", "&"}


def split_command_segments(command_line: str) -> list[list[str]]:
    """Split a shell command line into token lists per chained command segment."""
    lexer = shlex.shlex(command_line, posix=True, punctuation_chars=";&|")
    lexer.whitespace_split = False
    lexer.commenters = "#"
    tokens = list(lexer)

    segments: list[list[str]] = []
    current: list[str] = []
    for token in tokens:
        if token in CHAIN_DELIMITERS or token == "\n":
            if current:
                segments.append(current)
                current = []
        else:
            current.append(token)
    if current:
        segments.append(current)
    return segments


def extract_executable(segment: list[str]) -> tuple[str, list[str]]:
    """Skip leading env assignments and wrapper commands to find the executable."""
    idx = 0
    while idx < len(segment) and ENV_ASSIGN_RE.match(segment[idx]):
        idx += 1
    if idx >= len(segment):
        return "", []

    exe = os.path.basename(segment[idx])
    rest = segment[idx + 1 :]

    # Unwrap common wrappers like `env` or `timeout`
    if exe == "env":
        return extract_executable(rest)
    if exe == "timeout" and len(rest) >= 2:
        # Skip optional flags and duration
        j = 0
        while j < len(rest) and rest[j].startswith("-"):
            j += 1
        return extract_executable(rest[j + 1 :])

    return exe, rest


def inspect_command(command_line: str) -> tuple[str | None, bool]:
    """Return (forbidden_binary_or_none, has_git_push)."""
    try:
        segments = split_command_segments(command_line)
    except ValueError:
        # Unclosed quotes or complex shell syntax; let the shell/runtime handle it.
        return None, False

    has_git_push = False
    for segment in segments:
        exe, rest = extract_executable(segment)
        if not exe:
            continue

        # Commands executed via docker are explicitly allowed.
        if exe == "docker":
            continue

        if exe in FORBIDDEN_HOST_BINARIES:
            return exe, has_git_push

        # Also catch `python -m pytest|pip|alembic|ruff|uvicorn` on host
        if exe in {"python", "python3"} and len(rest) >= 2 and rest[0] == "-m":
            mod = rest[1].split(".")[0]
            if mod in FORBIDDEN_HOST_BINARIES:
                return f"{exe} -m {mod}", has_git_push

        if exe == "git" and "push" in rest:
            has_git_push = True

    return None, has_git_push


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({"decision": "allow"}))
        return 0

    args = payload.get("toolCall", {}).get("args", {})
    command_line = args.get("CommandLine", "")
    bypass_sandbox = bool(args.get("BypassSandbox", False))

    forbidden, has_git_push = inspect_command(command_line)
    if forbidden:
        print(
            json.dumps(
                {
                    "decision": "deny",
                    "reason": (
                        f"Blocked by Docker-only guardrail (.agents/hooks.json): "
                        f"'{forbidden}' must not run directly on the host. "
                        f"Run it inside Docker via 'docker compose exec <backend|frontend> ...' "
                        f"or 'docker compose run --rm <service> ...'."
                    ),
                }
            )
        )
        return 0

    if has_git_push or bypass_sandbox:
        print(
            json.dumps(
                {
                    "decision": "ask",
                    "reason": "Requires confirmation for git push or unsandboxed execution.",
                }
            )
        )
        return 0

    print(json.dumps({"decision": "allow"}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
