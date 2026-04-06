---
name: aw-build
description: Build approved work from `.aw_docs/features/<feature_slug>/` artifacts in thin, reversible increments with org-standard validation and handoff discipline.
trigger: User requests implementation of approved work, or a compatible `/aw:execute` request needs to route to the canonical build stage.
---

# AW Build

## Overview

`aw-build` owns implementation only.
It turns approved work into the smallest correct code, config, docs, or migration changes, then hands off to test or review instead of self-certifying success.

## When to Use

- approved implementation artifacts already exist
- the request is to code, configure, migrate, or document an approved change
- a bug was already investigated and now needs a concrete fix
- a legacy `/aw:execute` request arrives

Do not use for vague ideation, unclear bugs, or release-only work.

## Workflow

1. Intake the approved inputs.
   Load `spec.md`, `tasks.md`, and any relevant design or PRD context.
   If the plan has a critical gap, route back to `aw-plan`.
2. Select the smallest correct build mode.
   Choose `code`, `infra`, `docs`, `migration`, or `config`.
3. Slice the work before editing.
   Use `references/build-increments.md` to keep changes thin, reversible, and rollback-friendly.
   For multi-file or high-risk work, load `incremental-implementation`.
4. Build one slice at a time.
   For behavior changes, require RED-GREEN or a concrete failing signal.
   Use `references/testing-patterns.md` when test structure needs support.
5. Apply org standards during the slice.
   Respect `.aw_rules`, relevant platform playbooks, and the resolved GHL baseline.
   When context quality or scope focus is degrading, load `context-engineering`.
   For frontend work, load `references/frontend-quality-checklist.md`.
   For non-trivial UI work, load `frontend-ui-engineering`.
   For interface changes, load `references/interface-stability.md` and `api-and-interface-design`.
   For deprecation, removal, or migration slices, load `deprecation-and-migration`.
6. Record evidence and boundaries.
   Note what changed, what did not change, and which checks were run.
   Use `references/git-save-points.md` when the work needs explicit save-point discipline.
   For non-trivial commit boundaries, branch hygiene, or worktree isolation, load `git-workflow-and-versioning`.
7. Hand off cleanly.
   Route to `aw-test` for QA proof or `aw-review` when the work needs findings, governance, or readiness decisions.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is small enough to do in one big patch." | Small tasks still benefit from thin slices and explicit validation. |
| "I'll add tests after the code is working." | If the behavior is testable, failure-first proof should lead the change. |
| "Frontend changes don't need special handling." | Responsive behavior, accessibility, and design-system compliance are part of the work. |
| "I can just clean up adjacent code too." | Scope creep makes rollback and review harder. |

## Red Flags

- a slice touches unrelated files
- tests are hand-waved instead of run or explicitly declared unavailable
- the diff is large enough that rollback is unclear
- interface changes are made without boundary validation
- bugfix code appears before the failing signal is concrete

## Verification

Before leaving build, confirm:

- [ ] the change came from approved inputs or a clearly approved direct technical request
- [ ] the work was split into thin, reversible increments when non-trivial
- [ ] behavior changes have failing-signal evidence or a clear explanation of why not
- [ ] relevant org standards, platform playbooks, and `.aw_rules` were applied
- [ ] `execution.md` and `state.json` are updated
