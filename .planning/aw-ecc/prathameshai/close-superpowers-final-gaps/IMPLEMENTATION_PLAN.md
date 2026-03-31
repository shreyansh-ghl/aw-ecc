# Implementation Plan

Generated: 2026-03-31
Spec: .planning/aw-ecc/prathameshai/close-superpowers-final-gaps/.spec.md
Iteration: 1

## Tasks (Priority Order)

### 1. Harden always-on activation strictness
- **Why:** Superpowers still leads on startup strictness; AW routing must become more absolute before any substantive response.
- **Files:** `AGENTS.md`, `skills/using-aw-skills/SKILL.md`, `skills/using-aw-skills/hooks/session-start.sh`, `tests/evals/*activation*`
- **Patterns:** repo-local first-response contract, session-start route enforcement
- **Related solutions:** none found in `content/solutions/`
- **Status:** pending

### 2. Add operational worktree lifecycle support
- **Why:** `aw-prepare` currently classifies and recommends, but does not provide a concrete lifecycle helper that `aw-ship` and `aw-finish` can rely on.
- **Files:** `skills/aw-prepare/SKILL.md`, `skills/aw-finish/SKILL.md`, `skills/aw-ship/SKILL.md`, `commands/ship.md`, `skills/aw-prepare/scripts/*`, `tests/evals/*worktree*`
- **Patterns:** branch-backed worktree creation, workspace metadata handoff, safe cleanup rules
- **Related solutions:** none found in `content/solutions/`
- **Status:** pending

### 3. Productize the internal worker runtime for aw-execute
- **Why:** AW describes worker roles well but still lacks concrete worker runtime assets and bundle generation.
- **Files:** `skills/aw-execute/SKILL.md`, `commands/execute.md`, `skills/aw-execute/references/*`, `skills/aw-execute/scripts/*`, `tests/evals/*worker*`
- **Patterns:** bounded task-unit manifests, implementer/spec-review/quality-review templates, repo-local worker bundle generator
- **Related solutions:** none found in `content/solutions/`
- **Status:** pending
