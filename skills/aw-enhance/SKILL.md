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
- **Action:** Use the Skill tool to invoke `aw:aw-repo-setup`. Let that skill own the entire setup flow.
- **What happens:** Identify the GHL app from a screenshot, clone repos, install dependencies, wire Module Federation, start dev servers.
- **User input:** Screenshot of the page, or "already set up" to skip.
- **Auto-detect:** If the current working directory is a git repo, ask the user: "I see you're in {repo name}. Is this the right project, or do you need to set up a different one?" Never silently skip — always confirm.
- **Artifacts:** Local dev environment running.
- **Gate:** Ask user to confirm setup is complete before proceeding.

### Phase 2: What exists today?
- **Action:** YOU run this phase directly using Read, Grep, Glob tools. No skill invocation needed.
- **What happens:** Before asking what to change, understand what's already there. Specifically:
  1. Find the relevant files for the feature being enhanced (search by route, component name, or keyword)
  2. Read the current implementation — entry points, main logic, data flow
  3. Identify existing tests for this feature
  4. Note the current API endpoints and schema if applicable
  5. Summarize for the user: "Here's what I found about how {feature} works today"
- **User input:** Confirm the summary is accurate, or correct any misunderstandings.
- **Artifacts:** Current state summary in conversation (fed into Phase 3).
- **Gate:** Show summary. Ask "Is this accurate? Proceed to requirements, or correct something?"

### Phase 3: What needs to change?
- **Action:** Structured Q&A — YOU run this phase directly. No skill invocation needed.
- **What happens:** Now that we understand what exists, ask the user what should change:
  1. What behavior should be different?
  2. What new capability is needed?
  3. What should stay the same?
  4. Any constraints (backward compatibility, API stability, deadline)?
- **User input:** Enhancement description and answers.
- **Artifacts:** Enhancement requirements captured (fed into Phase 4).
- **Gate:** Summarize requirements back. Ask "Does this capture everything? Proceed, or tweak?"

### Phase 4: Write what's changing
- **Action:** Use the Skill tool to invoke `aw:plan`. Pass the requirements from Phase 3 and current state from Phase 2. Let aw-plan generate a **delta PRD** under `.aw_docs/features/<slug>/prd.md`. Do NOT write the PRD yourself. Tell aw-plan to use delta format:
  - **Current Behavior:** How it works today (from Phase 2)
  - **Proposed Changes:** What's being added/modified
  - **What Stays the Same:** Explicitly call out preserved behavior
  - **Acceptance Criteria:** For the delta only
- **User input:** Approval of the delta PRD.
- **Artifacts:** `.aw_docs/features/<slug>/prd.md` (delta format)
- **Gate:** Show delta PRD summary. Ask "Approve? Proceed, tweak, or redo?"

### Phase 5: How should we change it?
- **Action:** Use the Skill tool to invoke `aw:brainstorm` for exploring approaches. Once direction is chosen, use the Skill tool to invoke `aw:plan` in design mode. Let aw-plan write `design.md`. Do NOT write design.md yourself. Approaches should include:
  - Minimal change (extend existing patterns)
  - Moderate refactor (improve while enhancing)
  - Larger restructure (if current design doesn't support the change well)
- **User input:** Selection of preferred approach.
- **Artifacts:** `.aw_docs/features/<slug>/design.md`
- **Gate:** Show chosen approach. Ask "Happy with this? Proceed, or explore more?"

### Phase 6: Technical plan
- **Action:** Use the Skill tool to invoke `aw:plan` in technical mode. Let aw-plan generate `spec.md` and `tasks.md` under `.aw_docs/features/<slug>/`. Do NOT write these yourself. Tell aw-plan to specifically flag:
  - API contract changes (new fields, modified endpoints)
  - Schema/migration changes
  - Breaking changes and backward compatibility plan
- **User input:** Approval of the plan.
- **Artifacts:** `.aw_docs/features/<slug>/spec.md`, `.aw_docs/features/<slug>/tasks.md`
- **Gate:** Show plan summary. Ask "Approve? Proceed to build, tweak, or redo?"

### Phase 7: Make the changes
- **Action:** Use the Skill tool to invoke `aw:build`. Let aw-build implement the enhancement following `tasks.md` in incremental slices. Preserve existing behavior while adding new capability.
- **User input:** Approval per slice (or "continue" for auto-advance within build).
- **Artifacts:** Implementation code, `.aw_docs/features/<slug>/execution.md`
- **Gate:** Ask "Build complete. Proceed to code review, or adjust something?"

### Phase 8: Code review
- **Action:** Use the Skill tool to invoke `aw:review`. Let aw-review run the full review. Extra focus on regressions, unintended side effects, and API contract compliance.
- **What happens:** Code review on all changes with findings by severity.
- **User input:** Automatic — but show findings and ask for acknowledgment.
- **Artifacts:** Review findings.
- **Gate:** Show findings. Ask "Acknowledge and proceed, or fix something first?"

### Phase 9: Verify nothing broke
- **Action:** Use the Skill tool to invoke `aw:test`. Tell aw-test to use regression-first approach:
  1. Run ALL existing tests first — ensure nothing broke
  2. If existing tests fail → stop, report regression, recommend going to Phase 11
  3. Only after existing tests pass → run new tests for enhanced behavior
  4. Report coverage for both existing and new code paths
- **User input:** Automatic — show results.
- **Artifacts:** `.aw_docs/features/<slug>/verification.md`, test results.
- **Gate:** Show results. Ask "Tests look good? Proceed, or investigate failures?"

### Phase 10: Update documentation
- **Action:** Use the Skill tool to invoke `aw:build` in docs mode. Check for hardcoded strings (i18n compliance). Update affected README sections or API docs.
- **User input:** Automatic — show what was updated.
- **Artifacts:** Updated docs, i18n compliance check.
- **Gate:** Show what was updated. Ask "Docs complete? Proceed, or adjust?"

### Phase 11: Fix issues found
- **Action:** If issues exist from Phases 8-10: use the Skill tool to invoke `aw:investigate` for diagnosis, then `aw:build` for fixes. Priority: regressions → review findings → new test failures. If no issues: auto-skip with notice.
- **What happens:** Address issues. If new issues surface after fixes, loop back to Phase 8/9.
- **User input:** Approval for fixes.
- **Artifacts:** Fixes applied.
- **Gate:** Show what was fixed. Ask "Issues resolved? Proceed, or keep fixing?"

### Phase 12: Production readiness
- **Action:** Use the Skill tool to invoke `platform-infra-production-readiness` if available, otherwise run a manual checklist: env vars, configs, migrations, health probes, resource limits. Extra attention to migration safety for schema changes.
- **User input:** Acknowledge findings.
- **Artifacts:** Readiness checklist results.
- **Gate:** Show checklist. Ask "Ready for expert review? Proceed, or address findings first?"

### Phase 13: Expert review
- **Action:** Launch three Agent tool calls in parallel with `security-reviewer`, `architect`, and `code-reviewer` subagent types. Extra focus on backward compatibility and migration safety for enhancements. Collect findings.
- **User input:** Acknowledge findings.
- **Artifacts:** Specialist review findings.
- **Gate:** Show combined findings. Ask "Acknowledge and proceed, or fix something first?"

### Phase 14: Fix PR warnings
- **Action:** Run `git diff --stat` to check changes, then use the Agent tool with `build-error-resolver` subagent type to auto-fix lint/type/build warnings. Use the Skill tool to invoke `aw:review` in PR mode if needed.
- **What happens:** Scan and auto-fix. Report anything needing manual attention.
- **User input:** None — fully automatic. But still show results.
- **Gate:** Show what was fixed/remaining. Ask "PR clean? Proceed to staging, or fix more?"

### Phase 15: Deploy to staging
- **Action:** Use the Skill tool to invoke `aw:deploy` in staging mode. Call out what to specifically test (enhanced behavior + regression spots).
- **What happens:** Deploy to staging. Provide staging URL and verification checklist.
- **User input:** Confirmation to proceed.
- **Artifacts:** Staging URL, deploy confirmation, verification checklist.
- **Gate:** Show staging URL + checklist. Ask "Staging looks good? Proceed to production, or need more testing?"

### Phase 16: Go live
- **Action:** Use the Skill tool to invoke `aw:deploy` in production mode, then `aw:ship` for closeout. For schema changes, verify migration completed successfully.
- **User input:** Explicit approval to deploy to production.
- **Artifacts:** `.aw_docs/features/<slug>/release.md`, production confirmation.
- **Gate:** Final confirmation before deploy. After deploy, show release summary.

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

## Phase Gate (CRITICAL)

**NEVER auto-advance to the next phase.** At the end of every phase, you MUST:

1. Show what was produced in this phase
2. Ask the user one of:
   - "Phase N is complete. Want to **proceed to Phase N+1**, **tweak something** in this phase, or **skip ahead**?"
   - For automatic phases (8, 9, 10, 14): still show results and ask "Looks good? Proceed to Phase N+1, or want me to adjust something?"
3. **Wait for explicit approval** before moving forward
4. If the user wants to tweak: stay in the current phase, make the change, show updated output, ask again
5. Only advance when the user says "proceed", "continue", "next", "looks good", or equivalent

This is non-negotiable. The user controls the pace.

---

## Phase Transition UX

Every phase transition (after user approves) shows:

```
────────────────────────────────────────
  Phase N: {Name} — COMPLETE ✓
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
2. **Show the full phase overview immediately:**

```
────────────────────────────────────────
  /aw:enhance — 16-Phase Guided Enhancement

   1. Get set up               → aw-repo-setup
   2. What exists today?       → Codebase exploration
   3. What needs to change?    → Requirements Q&A
   4. Write what's changing    → aw-plan (delta PRD)
   5. How should we change it? → aw-brainstorm + aw-plan
   6. Technical plan           → aw-plan (spec + tasks)
   7. Make the changes         → aw-build
   8. Code review              → aw-review
   9. Verify nothing broke     → aw-test (regression-first)
  10. Update documentation     → aw-build (docs)
  11. Fix issues found         → aw-investigate + aw-build
  12. Production readiness     → Readiness checklist
  13. Expert review            → Parallel specialist agents
  14. Fix PR warnings          → Auto-fix (no user action)
  15. Deploy to staging        → aw-deploy (staging)
  16. Go live                  → aw-deploy (prod) + aw-ship

  Every phase is skippable. Say "skip" at any time.
  Say "show progress" to see this overview again.
────────────────────────────────────────
```

3. **Check for existing state** at `.aw_docs/features/<slug>/state.json`.
   - If exists: show progress with completed/skipped markers, ask "Resume from Phase N?" or let user navigate.
   - If not: create state.json, start at Phase 1.
4. **Phase 1 detection:** Check if current working directory is a git repo.
   - If yes: ask user "I see you're in {repo name}. Is this the right project?" If confirmed, skip Phase 1.
   - If no: run Phase 1 (`aw-repo-setup`).
5. **Begin the phase flow.**

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
