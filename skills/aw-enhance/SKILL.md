---
name: aw-enhance
description: Master enhancement orchestrator — 16-phase guided workflow for improving existing features. Understands current state first, then plans and builds the delta.
trigger: User invokes /aw:enhance or /enhance
---

# AW Enhance — 16-Phase Guided Enhancement

## Overview

`aw-enhance` orchestrates the enhancement of existing features in 16 phases. Unlike `aw-feature` (which builds from scratch), this skill starts by understanding what already exists, then plans and builds only what's changing.

**Why this matters:** Enhancements are riskier than new features — you're changing working code. Skipping the "understand first" step is the #1 cause of regressions.

**Target audience:** PMs who describe what should change, junior engineers who follow steps, senior engineers who skip to what they need.

**Cross-harness:** Works on Cursor, Claude Code, and Codex. Uses only standard tools (Read, Write, Edit, Bash, Grep, Glob) and `state.json` for progress. No dependency on hooks, MCP servers, or session persistence.

---

## The 16 Phases

### Phase 1: Get set up
- **Delegate:** `aw-repo-setup`
- **What happens:** Identify the GHL app from a screenshot, clone repos, install dependencies, wire Module Federation, start dev servers.
- **User input:** Screenshot of the page, or "already set up" to skip.
- **Auto-detect:** If the current working directory is a git repo, ask the user: "I see you're in {repo name}. Is this the right project, or do you need to set up a different one?" Never silently skip — always confirm.
- **Artifacts:** Local dev environment running.

### Phase 2: What exists today?
- **Delegate:** None — explore the codebase using Read, Grep, Glob.
- **What happens:** Before asking what to change, understand what's already there. Specifically:
  1. Find the relevant files for the feature being enhanced (search by route, component name, or keyword)
  2. Read the current implementation — entry points, main logic, data flow
  3. Identify existing tests for this feature
  4. Note the current API endpoints and schema if applicable
  5. Summarize for the user: "Here's what I found about how {feature} works today"
- **User input:** Confirm the summary is accurate, or correct any misunderstandings.
- **Artifacts:** Current state summary in conversation (fed into Phase 3).

### Phase 3: What needs to change?
- **Delegate:** None — structured Q&A.
- **What happens:** Now that we understand what exists, ask the user what should change:
  1. What behavior should be different?
  2. What new capability is needed?
  3. What should stay the same?
  4. Any constraints (backward compatibility, API stability, deadline)?
- **User input:** Enhancement description and answers.
- **Artifacts:** Enhancement requirements captured (fed into Phase 4).

### Phase 4: Write what's changing
- **Delegate:** `aw-plan` (product mode)
- **What happens:** Generate a delta PRD — not a full PRD, just what's changing. Structure:
  - **Current Behavior:** How it works today (from Phase 2)
  - **Proposed Changes:** What's being added/modified
  - **What Stays the Same:** Explicitly call out preserved behavior
  - **Acceptance Criteria:** For the delta only
- **User input:** Approval of the delta PRD.
- **Artifacts:** `.aw_docs/features/<slug>/prd.md` (delta format)

### Phase 5: How should we change it?
- **Delegate:** `aw-brainstorm` + `aw-plan` (design mode)
- **What happens:** Brainstorm approaches for the enhancement. Consider:
  - Minimal change (extend existing patterns)
  - Moderate refactor (improve while enhancing)
  - Larger restructure (if current design doesn't support the change well)
- **User input:** Selection of preferred approach.
- **Artifacts:** `.aw_docs/features/<slug>/design.md`

### Phase 6: Technical plan
- **Delegate:** `aw-plan` (technical + tasks mode)
- **What happens:** Generate spec and tasks. Specifically flag:
  - API contract changes (new fields, modified endpoints)
  - Schema/migration changes
  - Breaking changes and backward compatibility plan
- **User input:** Approval of the plan.
- **Artifacts:** `.aw_docs/features/<slug>/spec.md`, `.aw_docs/features/<slug>/tasks.md`

### Phase 7: Make the changes
- **Delegate:** `aw-build`
- **What happens:** Implement the enhancement following `tasks.md` in incremental slices. Preserve existing behavior while adding new capability.
- **User input:** Approval per slice (or "continue" for auto-advance).
- **Artifacts:** Implementation code, `.aw_docs/features/<slug>/execution.md`

### Phase 8: Code review
- **Delegate:** `aw-review`
- **What happens:** Run code review on all changes. Extra focus on:
  - Regressions in existing behavior
  - Unintended side effects
  - API contract compliance
- **User input:** None — automatic. Present findings for acknowledgment.
- **Artifacts:** Review findings.

### Phase 9: Verify nothing broke
- **Delegate:** `aw-test`
- **What happens:** Regression-first testing approach:
  1. Run ALL existing tests first — ensure nothing broke
  2. If existing tests fail → stop, report regression, go to Phase 11
  3. Only after existing tests pass → run new tests for enhanced behavior
  4. Report coverage for both existing and new code paths
- **User input:** None — automatic. Report results.
- **Artifacts:** `.aw_docs/features/<slug>/verification.md`, test results.

### Phase 10: Update documentation
- **Delegate:** `aw-build` (docs mode)
- **What happens:** Update documentation to reflect the enhancement. Check for hardcoded strings (i18n compliance). Update any affected README sections or API docs.
- **User input:** None — automatic.
- **Artifacts:** Updated docs, i18n compliance check.

### Phase 11: Fix issues found
- **Delegate:** `aw-investigate` + `aw-build`
- **What happens:** Address issues found in Phases 8-10. Priority order:
  1. Regressions (existing tests that broke)
  2. Review findings (code quality, security)
  3. New test failures
  If new issues surface after fixes, loop back to Phase 8/9.
- **User input:** Approval for fixes.
- **Artifacts:** Fixes applied.

### Phase 12: Production readiness
- **Delegate:** `platform-infra-production-readiness` skill
- **What happens:** Run production readiness checklist — env vars, configs, migrations, health probes, resource limits. Extra attention to migration safety for schema changes.
- **User input:** Acknowledge findings.
- **Artifacts:** Readiness checklist results.

### Phase 13: Expert review
- **Delegate:** Launch `security-reviewer`, `architect`, and `code-reviewer` agents in parallel
- **What happens:** Each specialist reviews the changes. Extra focus on backward compatibility and migration safety for enhancements.
- **User input:** Acknowledge findings.
- **Artifacts:** Specialist review findings.

### Phase 14: Fix PR warnings
- **Delegate:** `aw-review` (PR mode) + `build-error-resolver` agent
- **What happens:** Scan for lint errors, type errors, build warnings. Auto-fix what's fixable. Report anything needing manual attention.
- **User input:** None — fully automatic.
- **Auto-advance:** If no issues found, advance to Phase 15 immediately.
- **Artifacts:** Clean PR status.

### Phase 15: Deploy to staging
- **Delegate:** `aw-deploy` (staging mode)
- **What happens:** Deploy to staging environment. Provide staging URL for verification. Call out what to specifically test (the enhanced behavior + regression spots).
- **User input:** Confirmation to proceed.
- **Artifacts:** Staging URL, deploy confirmation, verification checklist.

### Phase 16: Go live
- **Delegate:** `aw-deploy` (production mode) + `aw-ship`
- **What happens:** Deploy to production. Run ship closeout. For schema changes, verify migration completed successfully.
- **User input:** Explicit approval to deploy to production.
- **Artifacts:** `.aw_docs/features/<slug>/release.md`, production confirmation.

---

## State Management

Track progress in `.aw_docs/features/<slug>/state.json`:

```json
{
  "feature": "enhance-contacts-filter",
  "phase": 3,
  "completed": [1, 2],
  "skipped": [],
  "status": "in_progress"
}
```

**On start:** Check if `state.json` exists. If yes, resume at `phase`. If no, create it and start at Phase 1.

**On phase complete:** Add phase to `completed`, increment `phase`, write `state.json`.

**On skip:** Add phase to `skipped`, increment `phase`, write `state.json`.

**On session resume:** Read `state.json`, display progress, continue from `phase`.

---

## Phase Transition UX

Every phase transition shows:

```
────────────────────────────────────────
  Phase N: {Name} — COMPLETE
  {What was produced}

  Phase N+1: {Name} — STARTING
  "{PM-friendly description}"

  {What happens next / what's needed from user}

  Progress: ██████░░░░░░░░░░ N/16
────────────────────────────────────────
```

---

## Skip Rules

Every phase is skippable. No exceptions. No blocking.

- **Warn for:** Phase 8 (Review), 9 (Test), 15 (Staging), 16 (Deploy)
  - Show a one-line warning about consequences, then skip immediately.
- **All other phases:** Skip silently.

Skip commands:
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
| "skip to phase 9" | Skip all intermediate phases, go to 9 |
| "go to phase 6" | Jump to phase 6 |
| "go to testing" | Map "testing" → Phase 9, go there |
| "go back to plan" | Map "plan" → Phase 6, go there |
| "show progress" / "where am I?" | Show full phase status table |
| "resume" | Read state.json, continue from current phase |

**Phase name mapping** (for natural language navigation):

| Keywords | Phase |
|---|---|
| repo, setup, baseline, project | 1 |
| current, exists, today, understand | 2 |
| requirements, change, needs | 3 |
| prd, delta, spec, product | 4 |
| design, options, approaches, how | 5 |
| plan, technical, api, schema, tasks | 6 |
| build, code, implement, make | 7 |
| review, code review | 8 |
| test, qa, verify, regression, broke | 9 |
| docs, i18n, documentation | 10 |
| debug, fix, stabilize, issues | 11 |
| audit, readiness, environment, production ready | 12 |
| specialist, expert, security, performance | 13 |
| pr, blockers, warnings, lint | 14 |
| staging, stage, verification link | 15 |
| deploy, production, go live, rollout | 16 |

---

## Starting the Flow

When `/aw:enhance` is invoked:

1. **Extract feature slug** from description (kebab-case, prefixed with "enhance-", e.g., "Improve contacts filter" → `enhance-contacts-filter`).
2. **Check for existing state** at `.aw_docs/features/<slug>/state.json`.
   - If exists: show progress, ask "Resume from Phase N?" or let user navigate.
   - If not: create state.json, start at Phase 1.
3. **Phase 1 detection:** Check if current working directory is a git repo.
   - If yes: ask user "I see you're in {repo name}. Is this the right project?" If confirmed, skip Phase 1.
   - If no: run Phase 1 (`aw-repo-setup`).
4. **Begin the phase flow.**

---

## Completion

The enhancement is done when Phase 16 completes or the user says "done" at any point.

On completion, update `state.json`:
```json
{
  "feature": "enhance-contacts-filter",
  "phase": 16,
  "completed": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  "skipped": [1],
  "status": "complete"
}
```

Show final summary:
```
────────────────────────────────────────
  Enhancement: enhance-contacts-filter — COMPLETE

  Completed: 15 phases
  Skipped: Phase 1
  Artifacts: prd.md, design.md, spec.md, tasks.md,
             execution.md, verification.md, release.md

  Progress: ████████████████ 16/16
────────────────────────────────────────
```
