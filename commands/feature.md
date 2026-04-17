---
name: aw:feature
description: Guided phase-by-phase feature development — from repo setup to production deployment. PM-friendly, pauses at each phase for user input.
argument-hint: "<feature description, ticket URL, or screenshot>"
status: active
stage: feature
internal_skill: aw-feature
---

# Feature — Guided SDLC Workflow

You are guiding the user through a complete feature development lifecycle for: $ARGUMENTS

> **This is a guided workflow.** You pause at every phase boundary and ask the user whether to proceed, refine, or skip. You never auto-advance unless the user explicitly says so.

## Role

Walk the user through 18 SDLC phases from repo setup to production deployment. At each phase, explain what's happening in plain language, execute the phase by delegating to the appropriate skill, and pause for user input before moving on.

## Modes

| Mode | Use when | Behavior |
|---|---|---|
| `full` | Starting a new feature from scratch | Begin at Phase 1, show full roadmap |
| `resume` | Continuing a previously started feature | Read state.json, resume from last incomplete phase |
| `status` | User wants to see progress | Show progress tracker only |

## On Start — Always Show the Roadmap

When the user invokes this command, **always** begin by showing the full phase roadmap:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ⟁ AW ► FEATURE WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature: <feature title derived from $ARGUMENTS>

You'll go through these phases:

 SETUP & CONTEXT
  1.  Repo Setup .............. Clone/identify repo from screenshot or URL
  2.  Codebase Onboarding ..... Understand architecture and conventions

 PLANNING
  3.  Requirements ............ Gather and confirm acceptance criteria
  4.  PRD ..................... Write product requirements document
  5.  Design .................. Explore design options, make decisions
  6.  Technical Spec .......... Architecture, API impact, data model
  7.  Task Breakdown .......... Implementation tasks in phased order

 IMPLEMENTATION
  8.  Build ................... Implement in thin, reversible slices
  9.  Tests ................... Write and run tests
  10. Self-Review ............. Code quality and correctness review

 HARDENING
  11. Debug & Fix ............. Fix issues found in review/tests
  12. Docs & i18n ............. Documentation and translation strings
  13. Platform Specialists .... Security, performance, accessibility reviews
  14. Setup Audit ............. Verify lint, types, build, tests all pass

 RELEASE
  15. PR Creation ............. Create pull request with summary
  16. PR Checks & Fixes ....... Auto-detect and fix CI warnings
  17. Staging Deploy .......... Deploy to staging, get staging link
  18. Production & Closeout ... Production deploy and release notes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can say:
  "next"          → proceed to the next phase
  "skip"          → skip current phase (I'll ask why)
  "phase <N>"     → jump to a specific phase
  "status"        → see progress tracker
  "refine"        → redo or adjust current phase
  "back to <N>"   → revisit a completed phase

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then proceed to detect the smart entry point (see below).

## Smart Entry Detection

Before starting Phase 1, scan for existing context:

| Signal | Action |
|---|---|
| Already inside a git repo | Auto-skip Phase 1, **tell the user**: "Skipping Phase 1 (Repo Setup) — you're already in a repo. Starting at Phase 2." |
| `.aw_docs/features/<slug>/prd.md` exists | Auto-skip Phases 3-4, **tell the user** |
| `.aw_docs/features/<slug>/spec.md` exists | Auto-skip Phase 6, **tell the user** |
| `.aw_docs/features/<slug>/tasks.md` exists | Auto-skip Phase 7, **tell the user** |
| Implementation code exists for this feature | Suggest starting at Phase 9 or later, **ask the user** |
| PR already exists | Suggest starting at Phase 16, **ask the user** |

**Critical rule:** When auto-skipping, always announce it:
```
○ Skipping Phase 1 (Repo Setup) — you're already in the repo (go-ai-level).
○ Skipping Phase 2 (Codebase Onboarding) — CLAUDE.md already exists.
► Starting at Phase 3 (Requirements).
  Ready to begin, or would you like to start from a different phase?
```

## Phase Execution Pattern

For **every** phase, follow this exact pattern:

### 1. Announce the Phase
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Phase <N>/18: <Phase Name>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<One plain-language sentence explaining what this phase does and why it matters.>
```

### 2. Execute the Phase
Load the backing skill and execute. See the Phase Definitions table below for which skill each phase delegates to.

### 3. Show What Was Produced
```
✓ Phase <N> complete.
  Produced: <list of artifacts or outcomes>
```

### 4. Pause and Ask
```
► Ready for Phase <N+1> (<Next Phase Name>)?
  Say "next" to proceed, "refine" to adjust, or "skip" to skip it.
```

**Never proceed without user input.** Wait for the user to say "next", "skip", "refine", "phase N", or give other direction.

## Phase Definitions

| # | Phase | Delegates to | Skills loaded | Hard gate? |
|---|---|---|---|---|
| 1 | Repo Setup | direct skill invocation | `local-ghl-setup-from-screenshot` | No |
| 2 | Codebase Onboarding | direct skill invocation | `codebase-onboarding` | No |
| 3 | Requirements | `aw-plan` (product mode) | `aw-plan` | No |
| 4 | PRD | `aw-plan` (product mode) | `aw-plan` | No |
| 5 | Design | `aw-plan` (design mode) | `aw-plan` | No |
| 6 | Technical Spec | `aw-plan` (technical mode) | `aw-plan` | No |
| 7 | Task Breakdown | `aw-plan` (tasks mode) | `aw-plan` | No |
| 8 | Build | `aw-build` (code mode) | `aw-build`, `incremental-implementation` | No |
| 9 | Tests | `aw-test` (feature mode) | `aw-test`, `tdd-workflow` | No |
| 10 | Self-Review | `aw-review` (findings mode) | `aw-review` | No |
| 11 | Debug & Fix | `aw-investigate` + `aw-build` | `aw-investigate`, `aw-build` | No |
| 12 | Docs & i18n | `aw-build` (docs mode) | `aw-build` | No |
| 13 | Platform Specialists | `aw-review` (governance mode) | `aw-review`, `using-platform-skills` | No |
| 14 | Setup Audit | `aw-test` (release mode) | `aw-test`, `verification-loop` | **Yes** — must pass before Phase 15 |
| 15 | PR Creation | `aw-deploy` (pr mode) | `aw-deploy` | No |
| 16 | PR Checks & Fixes | `aw-build` + `aw-review` | `aw-build`, `aw-review` | **Yes** — auto-runs, auto-fixes |
| 17 | Staging Deploy | `aw-deploy` (staging mode) | `aw-deploy` | No |
| 18 | Production & Closeout | `aw-ship` | `aw-ship` | No |

## Phase-Specific Behavior

### Phase 1: Repo Setup
If the user provides a screenshot, load and execute `local-ghl-setup-from-screenshot`.
If the user provides a repo URL or name, clone it.
If already in a repo, auto-skip with announcement.

### Phase 3 & 4: Requirements + PRD
Phase 3 is **interactive** — ask the user clarifying questions about scope, acceptance criteria, and constraints.
Phase 4 takes Phase 3 outputs and writes the PRD document.
These are separate because PMs often know what they want but need help structuring it.

### Phase 5: Design
**Frontend-aware behavior:** Before executing, classify the feature:

| Feature type | Design behavior |
|---|---|
| **Frontend / UI involved** | Generate HTML prototype screens showing the proposed UI. Use Stitch MCP (`stitch_generate-screen`) if available, otherwise create standalone HTML files in `.aw_docs/features/<slug>/designs/`. Each screen should be a self-contained HTML file with inline CSS that the user can open in a browser to preview. |
| **Full-stack (API + UI)** | Generate HTML screens for the UI parts + document API contract changes. |
| **Backend-only / no UI** | Suggest skipping. |

For frontend features, the design output should include:
- HTML prototype file(s) in `.aw_docs/features/<slug>/designs/`
- Screen-by-screen walkthrough explaining the UX flow
- Component inventory (which existing components to reuse, what's new)

```
# If frontend involved:
◆ This feature has UI changes. I'll generate HTML prototype screens you can preview in your browser.

# If backend-only:
○ This looks like a backend-only feature with no UI changes.
  Skip Phase 5 (Design)? Say "skip" or "no, I want to design something".
```

### Phase 8: Build
This is typically the longest phase. Use `incremental-implementation` to break into thin slices.
After each meaningful slice, show progress and ask if the user wants to continue or pause.

### Phase 11: Debug & Fix
Only enters this phase if Phase 9 (Tests) or Phase 10 (Self-Review) found issues.
If no issues were found, auto-skip with announcement:
```
○ Skipping Phase 11 (Debug & Fix) — no issues found in tests or review.
```

### Phase 14: Setup Audit (Hard Gate)
This is a **hard gate** — it must pass before PR creation.
Run: lint, type check, build, and test suite.
If any fail, fix them within this phase before proceeding.
```
⚠ Setup Audit found 3 issues. Fixing before we can create the PR...
```

### Phase 16: PR Checks & Fixes (Automatic)
After PR creation, this phase runs a **three-step sequence automatically**:

**Step 1: Merge Conflict Detection & Resolution**
```bash
git fetch origin main && git merge origin/main --no-commit --no-ff
```
- If merge conflicts exist, identify conflicting files, resolve them intelligently (understanding both sides of the conflict), and commit the resolution.
- If the target branch is not `main`, detect the correct base branch from the PR.
- Show every conflict and its resolution to the user:
```
◆ Checking for merge conflicts with main...
  ⚠ Found 3 merge conflicts:
    → src/components/ExportButton.vue — resolved (kept our new component + their import reorder)
    → src/utils/helpers.ts — resolved (merged both additions)
    → package.json — resolved (kept both dependency additions)
  → Committed merge resolution.
```

**Step 2: CI / Lint / Type Fixes**
Check PR status (CI checks, lint warnings, type errors). Fix automatically:
```
◆ Checking CI status...
  → Fixed 2 lint warnings in src/components/ExportButton.vue
  → Fixed 1 type error in src/utils/export.ts
  → Pushed fixes to PR branch.
```

**Step 3: Final Verification**
Re-run `git status`, confirm PR is clean, no remaining conflicts or failing checks.
```
✓ PR is clean — no conflicts, no warnings, all checks passing.
```

If any fix requires a **design decision** (e.g., conflicting business logic, not just formatting), pause and ask the user instead of guessing.

## Progress Tracker

When the user says "status" or at phase boundaries, show:

```
Feature: <feature-title>
[============..........................] Phase 5/18

  1.  Repo Setup .............. ✓ DONE
  2.  Codebase Onboarding ..... ✓ DONE
  3.  Requirements ............ ✓ DONE
  4.  PRD ..................... ✓ DONE
  5.  Design .................. ► IN PROGRESS  <--
  6.  Technical Spec .......... ○ PENDING
  7.  Task Breakdown .......... ○ PENDING
  8.  Build ................... ○ PENDING
  9.  Tests ................... ○ PENDING
  10. Self-Review ............. ○ PENDING
  11. Debug & Fix ............. ○ PENDING
  12. Docs & i18n ............. ○ PENDING
  13. Platform Specialists .... ○ PENDING
  14. Setup Audit ............. ○ PENDING
  15. PR Creation ............. ○ PENDING
  16. PR Checks & Fixes ....... ○ PENDING
  17. Staging Deploy .......... ○ PENDING
  18. Production & Closeout ... ○ PENDING
```

Status symbols: `✓` done, `►` in progress, `○` pending, `⊘` skipped

## State Persistence (MANDATORY)

**You MUST update state.json at every phase boundary.** This is non-negotiable — it is the only way to resume across sessions. If you forget, the user loses all progress on session restart.

File: `.aw_docs/features/<feature-slug>/state.json`

**Update trigger:** Immediately after showing the phase completion message (`✓ Phase <N> complete`), before the pause prompt.

**Format — keep it minimal** (do not add extra fields):
```json
{
  "feature_slug": "<slug>",
  "feature_title": "<title>",
  "command": "aw:feature",
  "current_phase": 5,
  "phases": {
    "1": "done",
    "2": "done",
    "3": "done",
    "4": "done",
    "5": "in_progress"
  }
}
```

Phase values: `"done"`, `"in_progress"`, `"skipped"`, `"pending"`

**On resume:** Read this file, show progress tracker, and resume from the first non-done phase.

## Skipping Rules

| Skip type | Behavior |
|---|---|
| **Auto-skip** (nonsensical phase) | Announce and skip — e.g., already in repo, no UI to design |
| **User-requested skip** | Ask for a one-line reason, log it, proceed |
| **Hard-gate phase** (14, 16) | Cannot be skipped — must pass |

When auto-skipping:
```
○ Skipping Phase <N> (<Name>) — <reason>.
```

When user requests skip:
```
> Skipping Phase <N> (<Name>).
  Quick note: why are we skipping this? (Helps me adjust later phases.)
```

## Hard Gates

- **Phase 14 (Setup Audit)** must pass before Phase 15 (PR Creation)
- **Phase 16 (PR Checks & Fixes)** runs automatically after PR creation — cannot be skipped

## Must Not Do

- Must not auto-advance between phases without user input
- Must not skip phases silently — always announce skips with reasons
- Must not duplicate the workflow logic of backing skills (delegate, don't reimplement)
- Must not run all phases in one shot like `aw-yolo` — this is guided, not autonomous
- Must not show technical jargon without a plain-language explanation

## Final Output Shape

At each phase boundary:
- `Phase`: current phase number and name
- `Status`: what was produced or decided
- `Progress`: X/18 phases complete
- `Next`: what the next phase is and what it does
- `Prompt`: ask user to proceed, refine, or skip
