---
name: git-commit
description: Create a structured, multi-line git commit and push to remote repository (main or user-specified branch) upon explicit user approval.
---

# Git Commit & Push Workflow Skill

Use this skill when the user explicitly approves changes (e.g. *"Zatwierdzam zmiany"*, *"Działa, możesz commitować"*, *"Wypchnij na repo"*), or when triggered via `/git-commit`.

> [!IMPORTANT]
> **Authorization Requirement:** Never commit or push autonomously during development. Only execute this workflow after explicit user approval.
> **Scope:** Only the Lead Orchestrator executes git commits and pushes. Specialized subagents are forbidden from pushing.

---

## 1. Step-by-Step Procedure

### Step 1: Inspect Changes & Guard Against Leaks
1. Check repository status:
   ```bash
   git status
   git diff --stat
   ```
2. Verify that NO secrets (`.env`), credentials, untracked temporary files, or local test dumps are staged.
3. If temporary/scratch files exist, clean them or add them to `.gitignore`.

### Step 2: Compose Structured Commit Message
Format the commit message following Conventional Commits with a concise, multi-line explanation in English:

* **Header (Line 1):** `<type>(<scope>): <summary>` (max 72 characters, imperative mood, lowercase).
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.
* **Blank Line (Line 2)**
* **Body (Lines 3+):** 2–5 bullet points explaining **what** was changed and **why**. Keep it concise yet informative (extend only for large multi-module features or extensive refactorings).

#### Example Commit Message
```text
feat(cv-editor): add multi-page SVG preview and debounced rendering

- Implement TypstCompiler service generating SVG vector arrays per page
- Add 400ms debounced live preview in split-view CV editor
- Add mobile tab switching between editor and live preview
- Cover Typst compilation with hermetic pytest unit tests
```

### Step 3: Stage and Commit
Stage tracked and newly added source files:
```bash
git add <target_files_or_directories>
git commit -m "<header>" -m "<bulleted_body>"
```

### Step 4: Push to Remote
1. Determine the target branch:
   - Default: `main`
   - If the user explicitly requested another branch (e.g., *"Wypchnij na feature/xyz"*), use that branch:
     ```bash
     git checkout -b <branch_name>  # if branch does not exist yet
     ```
2. Push to remote origin:
   ```bash
   git push origin <target_branch>
   ```

### Step 5: Report to User
Report the commit hash, target branch, and a brief confirmation to the user in Polish.
