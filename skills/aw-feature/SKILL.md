---
name: aw-feature
description: Phase-by-phase feature development orchestrator. Guides users through 18 SDLC phases from repo setup to production, composing existing AW stage skills. Pauses at each phase for user direction.
trigger: User invokes /aw:feature or asks for guided feature development, step-by-step feature workflow, or phase-by-phase development.
---

# AW Feature — Guided SDLC Orchestrator

## Overview

`aw-feature` is a **guided orchestrator** that walks users through 18 SDLC phases. Unlike `aw-yolo` (autonomous end-to-end), this skill pauses at every phase boundary to ask the user whether to proceed, refine, or skip. It composes existing stage skills — it never reimplements their logic.

The primary audience is **PMs, designers, and engineers** who want a structured workflow without needing to know which `/aw:*` commands to invoke in which order.

## When to Use

- User wants to develop a feature end-to-end with guidance
- User is non-technical and needs the system to guide them through SDLC stages
- User wants a structured checklist that prevents skipping important phases
- User says "feature", "guided flow", "step by step", "walk me through"

## When Not to Use

- User knows exactly which stage they need → use the specific `/aw:*` command
- User wants autonomous end-to-end execution → use `aw-yolo` internally
- User is doing a bug fix (too lightweight for 18 phases) → use `/aw:investigate` + `/aw:build`
- User only needs one phase (e.g., just planning) → use `/aw:plan` directly

## Workflow

### Step 1: Initialize

1. Parse `$ARGUMENTS` to derive a feature title and slug
2. Create `.aw_docs/features/<slug>/` directory
3. Create `state.json` with all 18 phases set to `pending`
4. Display the full 18-phase roadmap (from command contract)

### Step 2: Smart Entry Detection

Scan for existing context and announce any auto-skips:
- Already in a git repo → skip Phase 1
- `CLAUDE.md` or onboarding guide exists → skip Phase 2
- Planning artifacts exist → skip relevant planning phases
- Implementation exists → suggest starting at testing phase
- PR exists → suggest starting at PR checks phase

**Always announce every skip.** Never silently skip.

### Step 3: Execute Current Phase

For each phase:

1. **Announce** — Show phase header with plain-language explanation
2. **Load backing skill** — Read the SKILL.md for the delegated skill
3. **Execute** — Run the skill's workflow within its contract
4. **Update state.json** — **MANDATORY.** Write the phase status immediately. This is the only way to resume across sessions. Use the minimal format: `{ "1": "done", "2": "in_progress" }`. Do this BEFORE showing the completion message.
5. **Show output** — Summarize what was produced
6. **Pause** — Ask user to proceed, refine, or skip

### Step 4: Handle User Navigation

| User says | Action |
|---|---|
| "next" | Mark current phase done, advance to next pending phase |
| "skip" | Ask for reason, log it, mark as skipped, advance |
| "refine" | Re-enter current phase with additional context |
| "phase N" | Jump to Phase N (mark intervening phases as skipped with note) |
| "status" | Show progress tracker |
| "back to N" | Re-enter Phase N (mark as in_progress again) |
| "pause" / "stop" | Save state, show how to resume later |

### Step 5: Phase Completion

After each phase completes:
- Update `state.json`
- Show progress tracker (brief version — just the bar and current position)
- Prompt for next action

### Step 6: Feature Completion

When Phase 18 completes (or user says "done"):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AW ► FEATURE COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature: <title>
Phases completed: <N>/18 (skipped: <M>)

Artifacts:
  - PRD: .aw_docs/features/<slug>/prd.md
  - Spec: .aw_docs/features/<slug>/spec.md
  - PR: <PR URL>
  - Staging: <staging URL>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Phase Definitions

### Phase 1: Repo Setup
**What:** Clone the right repo from a screenshot or URL.
**Skill:** `local-ghl-setup-from-screenshot`
**Plain language:** "First, let's make sure you have the right code on your machine."
**Auto-skip when:** Already inside a git repository.

### Phase 2: Codebase Onboarding
**What:** Understand the repo's architecture, conventions, and entry points.
**Skill:** `codebase-onboarding`
**Plain language:** "Let me quickly understand how this codebase is organized."
**Auto-skip when:** `CLAUDE.md` already exists with onboarding content.

### Phase 3: Requirements
**What:** Interactive Q&A to gather scope, acceptance criteria, and constraints.
**Skill:** `aw-plan` (product mode — requirements gathering only)
**Plain language:** "Let's nail down exactly what this feature needs to do."
**Behavior:** Ask 3-5 focused questions about scope, users, success criteria. Wait for answers.

### Phase 4: PRD
**What:** Write a structured product requirements document from Phase 3 outputs.
**Skill:** `aw-plan` (product mode — document generation)
**Plain language:** "Now I'll write up the requirements so everyone's on the same page."
**Auto-skip when:** `prd.md` already exists for this feature.

### Phase 5: Design
**What:** Explore design options, make UX/UI decisions. For frontend features, generate HTML prototype screens.
**Skill:** `aw-plan` (design mode). For frontend features, also use Stitch MCP (`stitch_generate-screen`) if available.
**Plain language:** "Let's figure out how this should look and work for users."

**Frontend-aware behavior:**
- If the feature involves **any UI changes**: Generate self-contained HTML prototype files in `.aw_docs/features/<slug>/designs/`. Each file should have inline CSS so the user can open it in a browser to preview. Include a screen-by-screen UX walkthrough and a component inventory (existing components to reuse vs new ones to build).
- If the feature is **full-stack**: Generate HTML screens for UI parts + document API contract changes.
- If the feature is **backend-only**: Suggest skipping.

**Suggest skip when:** Backend-only feature with no UI component.

### Phase 6: Technical Spec
**What:** Architecture decisions, API impact, data model changes.
**Skill:** `aw-plan` (technical mode)
**Plain language:** "Time to plan the technical approach — what to build and how."
**Auto-skip when:** `spec.md` already exists for this feature.

### Phase 7: Task Breakdown
**What:** Break implementation into ordered, phased tasks.
**Skill:** `aw-plan` (tasks mode)
**Plain language:** "Breaking the work into small, manageable steps."
**Auto-skip when:** `tasks.md` already exists for this feature.

### Phase 8: Build
**What:** Implement code in thin, reversible slices.
**Skill:** `aw-build` (code mode) + `incremental-implementation`
**Plain language:** "Building the feature, one piece at a time."
**Behavior:** After each meaningful slice, pause and show progress. This is the longest phase.

### Phase 9: Tests
**What:** Write and run unit/integration tests.
**Skill:** `aw-test` (feature mode) + `tdd-workflow`
**Plain language:** "Writing tests to make sure everything works correctly."

### Phase 10: Self-Review
**What:** Automated code quality, correctness, and architecture review.
**Skill:** `aw-review` (findings mode)
**Plain language:** "Reviewing the code for quality, bugs, and best practices."

### Phase 11: Debug & Fix
**What:** Fix issues found in tests or review.
**Skill:** `aw-investigate` + `aw-build`
**Plain language:** "Fixing the issues we found in testing and review."
**Auto-skip when:** Phase 9 and Phase 10 found no issues.

### Phase 12: Docs & i18n
**What:** Update documentation and add translation strings.
**Skill:** `aw-build` (docs mode)
**Plain language:** "Updating docs and making sure text is translatable."
**Suggest skip when:** No user-facing strings changed and no public API changed.

### Phase 13: Platform Specialists
**What:** Security, performance, accessibility, and domain-specific reviews.
**Skill:** `aw-review` (governance mode) + `using-platform-skills`
**Plain language:** "Getting specialist reviews — security, performance, accessibility."

### Phase 14: Setup Audit (HARD GATE)
**What:** Verify lint, types, build, and full test suite pass.
**Skill:** `aw-test` (release mode) + `verification-loop`
**Plain language:** "Final check — making sure everything compiles and all tests pass."
**Hard gate:** Must pass before PR creation. Cannot be skipped.

### Phase 15: PR Creation
**What:** Create a pull request with summary and test plan.
**Skill:** `aw-deploy` (pr mode)
**Plain language:** "Creating a pull request so the team can review your changes."

### Phase 16: PR Checks & Fixes (AUTOMATIC)
**What:** Resolve merge conflicts, fix CI warnings, lint errors, and type issues.
**Skill:** `aw-build` + `aw-review`
**Plain language:** "Checking the PR for merge conflicts and warnings, then fixing them automatically."
**Hard gate:** Cannot be skipped.

**Three-step automatic sequence:**

1. **Merge Conflict Detection & Resolution**
   - Fetch and attempt merge with target branch (detect base from PR, default to `main`)
   - If conflicts exist: identify conflicting files, resolve intelligently, show each resolution to user, commit
   - If conflict involves business logic (not just formatting/imports): pause and ask user for the correct resolution

2. **CI / Lint / Type Fixes**
   - Check PR status for failing checks, lint warnings, type errors
   - Fix automatically, push to PR branch

3. **Final Verification**
   - Confirm no remaining conflicts, all checks passing
   - If still failing after fixes, report what's left and ask user for direction

### Phase 17: Staging Deploy
**What:** Deploy to staging environment and provide staging link.
**Skill:** `aw-deploy` (staging mode)
**Plain language:** "Deploying to staging so you can test it in a real environment."

### Phase 18: Production & Closeout
**What:** Production deployment, rollback readiness, release notes.
**Skill:** `aw-ship`
**Plain language:** "Final step — deploying to production and closing out the release."

## State File Contract (MANDATORY — write at every phase boundary)

**You MUST update this file after every phase transition.** This is the only way to resume across sessions. If you skip this, the user loses all progress.

**Keep it minimal** — do not add extra fields. The format is intentionally small so it's fast to write and survives context window limits:

```json
{
  "feature_slug": "contacts-export-button",
  "feature_title": "Build a contacts export button",
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

**Write trigger:** Immediately after a phase completes or is skipped, before showing the pause prompt. Use the Write tool — do not defer or batch.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The user said next so I can rush through" | "Next" means advance ONE phase, then pause again |
| "This phase doesn't apply, I'll skip silently" | Always announce skips with a reason |
| "I'll do phases 8-10 in one go since they're related" | Each phase gets its own announcement, execution, and pause |
| "The user is technical, they don't need the plain-language explanation" | Always show the explanation — it costs nothing and helps tracking |
| "Phase 16 needs user input for each fix" | Phase 16 is automatic — fix and push without asking unless a decision is needed |
| "I can skip the progress tracker, the user knows where we are" | Always show progress at phase boundaries |

## Red Flags

- Advancing to the next phase without the user saying "next" or equivalent
- Skipping a phase without announcing it
- Running more than one phase in a single response without pausing between them
- Reimplementing logic that belongs in a backing skill (e.g., writing test code instead of loading `aw-test`)
- Showing the progress tracker without phase status symbols
- Letting Phase 15 (PR Creation) proceed when Phase 14 (Setup Audit) hasn't passed

## Verification

- [ ] All 18 phases are defined with backing skills
- [ ] Every phase pauses for user input before advancing
- [ ] Auto-skips are announced with reasons
- [ ] Hard gates (Phase 14, 16) cannot be bypassed
- [ ] Progress tracker uses correct status symbols (✓ ► ○ ⊘)
- [ ] State.json is updated after every phase transition
- [ ] Plain-language descriptions are shown for every phase

## Final Output Shape

At each phase boundary, always include:
- `Phase` — current phase number and name
- `Status` — what was produced or decided
- `Progress` — visual progress bar + X/18
- `Next` — what the next phase is and a plain-language description
- `Prompt` — ask user to proceed, refine, or skip
