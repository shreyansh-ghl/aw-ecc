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
- **Action:** Use the Skill tool to invoke `aw:aw-repo-setup`. Let that skill own the entire setup flow.
- **What happens:** Identify the GHL app from a screenshot, clone repos, install dependencies, wire Module Federation, start dev servers.
- **User input:** Screenshot of the page, or "already set up" to skip.
- **Auto-detect:** If the current working directory is a git repo, ask the user: "I see you're in {repo name}. Is this the right project, or do you need to set up a different one?" Never silently skip — always confirm.
- **Artifacts:** Local dev environment running.
- **Gate:** Ask user to confirm setup is complete before proceeding.

### Phase 2: What do we need?
- **Action:** Structured Q&A — no skill invocation needed. YOU run this phase directly.
- **What happens:** Ask the user structured questions to understand the feature: who it's for, core behavior, existing features it builds on, constraints, deadline.
- **User input:** Feature description and answers to questions.
- **Artifacts:** Requirements captured in conversation (fed into Phase 3).
- **Gate:** Summarize requirements back to user. Ask "Does this capture everything? Proceed to Phase 3, or tweak something?"

### Phase 3: Write the spec
- **Action:** Use the Skill tool to invoke `aw:plan`. Pass the requirements from Phase 2. Let aw-plan generate `prd.md` under `.aw_docs/features/<slug>/`. Do NOT write the PRD yourself — aw-plan owns that artifact.
- **What happens:** aw-plan takes the requirements and generates a PRD.
- **User input:** Approval of the PRD.
- **Artifacts:** `.aw_docs/features/<slug>/prd.md`
- **Gate:** Show the PRD summary. Ask "Approve this spec? Proceed, tweak, or redo?"

### Phase 4: Explore approaches
- **Action:** Use the Skill tool to invoke `aw:brainstorm` for exploring approaches. Once direction is chosen, use the Skill tool to invoke `aw:plan` in design mode. Let aw-plan write `design.md`. Do NOT write design.md yourself.
- **What happens:** Brainstorm implementation approaches, present trade-offs, let user choose.
- **User input:** Selection of preferred approach.
- **Artifacts:** `.aw_docs/features/<slug>/design.md`
- **Gate:** Show chosen approach summary. Ask "Happy with this direction? Proceed, or explore more?"

### Phase 5: Technical plan
- **Action:** Use the Skill tool to invoke `aw:plan` in technical mode. Let aw-plan generate `spec.md` and `tasks.md` under `.aw_docs/features/<slug>/`. Do NOT write these yourself.
- **What happens:** aw-plan generates technical spec and task breakdown. Flags API contract changes and breaking changes.
- **User input:** Approval of the plan.
- **Artifacts:** `.aw_docs/features/<slug>/spec.md`, `.aw_docs/features/<slug>/tasks.md`
- **Gate:** Show plan summary. Ask "Approve this plan? Proceed to build, tweak, or redo?"

### Phase 6: Write the code
- **Action:** Use the Skill tool to invoke `aw:build`. Let aw-build implement the feature following `tasks.md` in incremental slices.
- **What happens:** Implementation in thin, reversible slices per tasks.md.
- **User input:** Approval per slice (or "continue" for auto-advance within build).
- **Artifacts:** Implementation code, `.aw_docs/features/<slug>/execution.md`
- **Gate:** Ask "Build complete. Proceed to code review, or want to adjust something?"

### Phase 7: Code review
- **Action:** Use the Skill tool to invoke `aw:review`. Let aw-review run the full review and produce findings.
- **What happens:** Code review on all changes. Findings reported by severity.
- **User input:** Automatic — but show findings and ask for acknowledgment.
- **Artifacts:** Review findings.
- **Gate:** Show findings summary. Ask "Acknowledge and proceed, or fix something first?"

### Phase 8: Verify it works
- **Action:** Use the Skill tool to invoke `aw:test`. Let aw-test run suites and produce verification.md.
- **What happens:** Run test suites, report coverage, verify behavior.
- **User input:** Automatic — show results.
- **Artifacts:** `.aw_docs/features/<slug>/verification.md`, test results.
- **Gate:** Show test results. Ask "Tests look good? Proceed, or investigate failures?"

### Phase 9: Docs & translations
- **Action:** Use the Skill tool to invoke `aw:build` in docs mode. Check for hardcoded strings (i18n compliance).
- **What happens:** Update documentation, README, check i18n.
- **User input:** Automatic — show what was updated.
- **Artifacts:** Updated docs, i18n compliance check.
- **Gate:** Show what was updated. Ask "Docs complete? Proceed, or adjust?"

### Phase 10: Fix issues
- **Action:** If issues exist from Phases 7-9: use the Skill tool to invoke `aw:investigate` for diagnosis, then `aw:build` for fixes. If no issues: auto-skip with notice.
- **What happens:** Address issues found in Phases 7-9. If new issues surface, loop back to review/test.
- **User input:** Approval for fixes.
- **Artifacts:** Fixes applied.
- **Gate:** Show what was fixed. Ask "Issues resolved? Proceed, or keep fixing?"

### Phase 11: Production readiness check
- **Action:** Use the Skill tool to invoke `platform-infra-production-readiness` if available, otherwise run a manual checklist: env vars, configs, migrations, health probes, resource limits.
- **What happens:** Run the production readiness checklist.
- **User input:** Acknowledge findings.
- **Artifacts:** Readiness checklist results.
- **Gate:** Show checklist results. Ask "Ready for expert review? Proceed, or address findings first?"

### Phase 12: Expert review
- **Action:** Launch three Agent tool calls in parallel with `security-reviewer`, `architect`, and `code-reviewer` subagent types. Collect findings.
- **What happens:** Each specialist agent reviews the changes from their perspective. Collect and present findings by severity.
- **User input:** Acknowledge findings.
- **Artifacts:** Specialist review findings.
- **Gate:** Show combined findings. Ask "Acknowledge and proceed, or fix something first?"

### Phase 13: Fix PR warnings
- **Action:** Run `git diff --stat` to check for changes, then use the Agent tool with `build-error-resolver` subagent type to auto-fix lint/type/build warnings. Use the Skill tool to invoke `aw:review` in PR mode if needed.
- **What happens:** Scan for lint errors, type errors, build warnings. Auto-fix what's fixable. Report anything needing manual attention.
- **User input:** None — fully automatic. But still show results.
- **Gate:** Show what was fixed/remaining. Ask "PR clean? Proceed to staging, or fix more?"

### Phase 14: Deploy to staging
- **Action:** Use the Skill tool to invoke `aw:deploy` in staging mode.
- **What happens:** Deploy to staging environment. Provide staging URL.
- **User input:** Confirmation to proceed.
- **Artifacts:** Staging URL, deploy confirmation.
- **Gate:** Show staging URL. Ask "Staging looks good? Proceed to production, or need more testing?"

### Phase 15: Go live
- **Action:** Use the Skill tool to invoke `aw:deploy` in production mode, then `aw:ship` for closeout.
- **What happens:** Deploy to production. Run ship closeout.
- **User input:** Explicit approval to deploy to production.
- **Artifacts:** `.aw_docs/features/<slug>/release.md`, production confirmation.
- **Gate:** Final confirmation before deploy. After deploy, show release summary.

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

## Phase Gate (CRITICAL)

**NEVER auto-advance to the next phase.** At the end of every phase, you MUST:

1. Show what was produced in this phase
2. Ask the user one of:
   - "Phase N is complete. Want to **proceed to Phase N+1**, **tweak something** in this phase, or **skip ahead**?"
   - For automatic phases (7, 8, 9, 13): still show results and ask "Looks good? Proceed to Phase N+1, or want me to adjust something?"
3. **Wait for explicit approval** before moving forward
4. If the user wants to tweak: stay in the current phase, make the change, show updated output, ask again
5. Only advance when the user says "proceed", "continue", "next", "looks good", or equivalent

This is non-negotiable. The user controls the pace.

---

## Phase Transition UX

Every phase transition (after user approves) shows this block:

```
────────────────────────────────────────
  Phase N: {Name} — COMPLETE ✓
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
2. **Show the full phase overview immediately:**

```
────────────────────────────────────────
  /aw:feature — 15-Phase Guided Development

   1. Set up the project        → aw-repo-setup
   2. What do we need?          → Requirements Q&A
   3. Write the spec            → aw-plan (PRD)
   4. Explore approaches        → aw-brainstorm + aw-plan
   5. Technical plan            → aw-plan (spec + tasks)
   6. Write the code            → aw-build
   7. Code review               → aw-review
   8. Verify it works           → aw-test
   9. Docs & translations       → aw-build (docs)
  10. Fix issues                → aw-investigate + aw-build
  11. Production readiness      → Readiness checklist
  12. Expert review             → Parallel specialist agents
  13. Fix PR warnings           → Auto-fix (no user action)
  14. Deploy to staging         → aw-deploy (staging)
  15. Go live                   → aw-deploy (prod) + aw-ship

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
