---
name: aw-feature
description: Master feature development orchestrator — 15-phase guided SDLC from requirements to deployment. Designed for PMs, junior engineers, and senior engineers alike.
trigger: User invokes /aw:feature or /feature
---

# AW Feature — 15-Phase Guided Development

## Overview

`aw-feature` orchestrates the full feature development lifecycle in 15 phases. It delegates to existing AW skills at each phase — no logic duplication. Users are guided step-by-step but can skip any phase at any time.

**Target audience:** PMs who describe what they want, junior engineers who follow steps, senior engineers who skip to what they need.

**Cross-harness:** Works on Cursor, Claude Code, and Codex. Uses only standard tools (Read, Write, Edit, Bash, Grep, Glob) and `state.json` for progress. No dependency on hooks, MCP servers, or session persistence.

---

## The 15 Phases

### Phase 1: Set up the project
- **Delegate:** `aw-repo-setup`
- **What happens:** Identify the GHL app from a screenshot, clone repos, install dependencies, wire Module Federation, start dev servers.
- **User input:** Screenshot of the page, or "already set up" to skip.
- **Auto-detect:** If the current working directory is a git repo, ask the user: "I see you're in {repo name}. Is this the right project, or do you need to set up a different one?" Never silently skip — always confirm.
- **Artifacts:** Local dev environment running.

### Phase 2: What do we need?
- **Delegate:** None — this is a structured Q&A phase, not a skill invocation.
- **What happens:** Ask the user structured questions to understand the feature: who it's for, core behavior, existing features it builds on, constraints, deadline.
- **User input:** Feature description and answers to questions.
- **Artifacts:** Requirements captured in conversation (fed into Phase 3).

### Phase 3: Write the spec
- **Delegate:** `aw-plan` (product mode)
- **What happens:** Take the requirements from Phase 2 and generate a PRD via `aw-plan`.
- **User input:** Approval of the PRD.
- **Artifacts:** `.aw_docs/features/<slug>/prd.md`

### Phase 4: Explore approaches
- **Delegate:** `aw-brainstorm` + `aw-plan` (design mode)
- **What happens:** Brainstorm implementation approaches, present trade-offs, let user choose.
- **User input:** Selection of preferred approach.
- **Artifacts:** `.aw_docs/features/<slug>/design.md`

### Phase 5: Technical plan
- **Delegate:** `aw-plan` (technical + tasks mode)
- **What happens:** Generate technical spec and task breakdown. Flag API contract changes and breaking changes.
- **User input:** Approval of the plan.
- **Artifacts:** `.aw_docs/features/<slug>/spec.md`, `.aw_docs/features/<slug>/tasks.md`

### Phase 6: Write the code
- **Delegate:** `aw-build`
- **What happens:** Implement the feature following `tasks.md` in incremental slices.
- **User input:** Approval per slice (or "continue" for auto-advance).
- **Artifacts:** Implementation code, `.aw_docs/features/<slug>/execution.md`

### Phase 7: Code review
- **Delegate:** `aw-review`
- **What happens:** Run code review on all changes. Report findings by severity.
- **User input:** None — automatic. Present findings for acknowledgment.
- **Artifacts:** Review findings.

### Phase 8: Verify it works
- **Delegate:** `aw-test`
- **What happens:** Run test suites, report coverage, verify behavior.
- **User input:** None — automatic. Report results.
- **Artifacts:** `.aw_docs/features/<slug>/verification.md`, test results.

### Phase 9: Docs & translations
- **Delegate:** `aw-build` (docs mode)
- **What happens:** Update documentation, README, check for hardcoded strings (i18n compliance).
- **User input:** None — automatic.
- **Artifacts:** Updated docs, i18n compliance check.

### Phase 10: Fix issues
- **Delegate:** `aw-investigate` + `aw-build`
- **What happens:** Address issues found in Phases 7-9. If new issues surface, loop back to review/test.
- **User input:** Approval for fixes.
- **Artifacts:** Fixes applied.

### Phase 11: Production readiness check
- **Delegate:** `platform-infra-production-readiness` skill
- **What happens:** Run the production readiness checklist — environment variables, configs, migrations, health probes, resource limits.
- **User input:** Acknowledge findings.
- **Artifacts:** Readiness checklist results.

### Phase 12: Expert review
- **Delegate:** Launch `security-reviewer`, `architect`, and `code-reviewer` agents in parallel
- **What happens:** Each specialist agent reviews the changes from their perspective. Collect and present findings by severity.
- **User input:** Acknowledge findings.
- **Artifacts:** Specialist review findings.

### Phase 13: Fix PR warnings
- **Delegate:** `aw-review` (PR mode) + `build-error-resolver` agent
- **What happens:** Scan for lint errors, type errors, build warnings. Use `build-error-resolver` to auto-fix what's fixable. Report anything that needs manual attention.
- **User input:** None — fully automatic.
- **Auto-advance:** If no issues found, advance to Phase 14 immediately.
- **Artifacts:** Clean PR status.

### Phase 14: Deploy to staging
- **Delegate:** `aw-deploy` (staging mode)
- **What happens:** Deploy to staging environment. Provide staging URL.
- **User input:** Confirmation to proceed.
- **Artifacts:** Staging URL, deploy confirmation.

### Phase 15: Go live
- **Delegate:** `aw-deploy` (production mode) + `aw-ship`
- **What happens:** Deploy to production. Run ship closeout.
- **User input:** Explicit approval to deploy to production.
- **Artifacts:** `.aw_docs/features/<slug>/release.md`, production confirmation.

---

## State Management

Track progress in `.aw_docs/features/<slug>/state.json`:

```json
{
  "feature": "bulk-email-scheduling",
  "phase": 6,
  "completed": [1, 2, 3, 4, 5],
  "skipped": [],
  "status": "in_progress"
}
```

**On start:** Check if `state.json` exists for this feature. If yes, resume at `phase`. If no, create it and start at Phase 1.

**On phase complete:** Add phase number to `completed`, increment `phase`, write `state.json`.

**On skip:** Add phase number to `skipped`, increment `phase`, write `state.json`.

**On session resume:** Read `state.json`, display current progress, continue from `phase`.

---

## Phase Transition UX

Every phase transition shows this block:

```
────────────────────────────────────────
  Phase N: {Name} — COMPLETE
  {What was produced}

  Phase N+1: {Name} — STARTING
  "{PM-friendly description}"

  {What happens next / what's needed from user}

  Progress: ██████░░░░░░░░░ N/15
────────────────────────────────────────
```

---

## Skip Rules

Every phase is skippable. No exceptions. No blocking.

- **Warn for:** Phase 7 (Review), 8 (Test), 14 (Staging), 15 (Deploy)
  - Show a one-line warning about consequences, then skip immediately.
- **All other phases:** Skip silently.

Skip commands the user can say:
- "skip" — skip current phase
- "skip phase N" — skip a specific phase
- "skip to phase N" — skip all phases up to N
- "I don't need this"

---

## Navigation

Users navigate with natural language:

| User says | Action |
|---|---|
| "skip" | Skip current phase, advance to next |
| "skip to phase 8" | Skip all intermediate phases, go to 8 |
| "go to phase 5" | Jump to phase 5 |
| "go to testing" | Map "testing" → Phase 8, go there |
| "go back to design" | Map "design" → Phase 4, go there |
| "show progress" / "where am I?" | Show full phase status table |
| "resume" | Read state.json, continue from current phase |

**Phase name mapping** (for natural language navigation):

| Keywords | Phase |
|---|---|
| repo, setup, clone, project | 1 |
| requirements, needs, what | 2 |
| prd, spec, product | 3 |
| design, options, approaches | 4 |
| plan, technical, api, tasks | 5 |
| build, code, implement | 6 |
| review, code review | 7 |
| test, qa, verify | 8 |
| docs, i18n, documentation, translations | 9 |
| debug, fix, issues | 10 |
| audit, readiness, production readiness check | 11 |
| specialist, expert, security, performance | 12 |
| pr, blockers, warnings, lint | 13 |
| staging, stage | 14 |
| deploy, production, go live, ship | 15 |

---

## Starting the Flow

When `/aw:feature` is invoked:

1. **Extract feature slug** from the user's description (kebab-case, e.g., "Add bulk email" → `bulk-email`).
2. **Check for existing state** at `.aw_docs/features/<slug>/state.json`.
   - If exists: show progress, ask "Resume from Phase N?" or let user navigate.
   - If not: create state.json, start at Phase 1.
3. **Phase 1 detection:** Check if current working directory is a git repo.
   - If yes: ask user "I see you're in {repo name}. Is this the right project?" If confirmed, skip Phase 1.
   - If no: run Phase 1 (`aw-repo-setup`).
4. **Begin the phase flow.**

---

## Completion

The feature is done when Phase 15 completes or the user says "done" at any point.

On completion, update `state.json`:
```json
{
  "feature": "bulk-email-scheduling",
  "phase": 15,
  "completed": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  "skipped": [1],
  "status": "complete"
}
```

Show final summary:
```
────────────────────────────────────────
  Feature: bulk-email-scheduling — COMPLETE

  Completed: 14 phases
  Skipped: Phase 1
  Artifacts: prd.md, design.md, spec.md, tasks.md,
             execution.md, verification.md, release.md

  Progress: ███████████████ 15/15
────────────────────────────────────────
```
