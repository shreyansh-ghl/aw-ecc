---
name: aw-build
description: Build approved work from `.aw_docs/features/<feature_slug>/` artifacts in thin, reversible increments with org-standard validation and handoff discipline.
trigger: User requests implementation of approved work, or a compatible `/aw:execute` request needs to route to the canonical build stage.
---

# AW Build

## Overview

`aw-build` owns implementation only.
It turns approved work into the smallest correct code, config, docs, or migration changes, continues through the full approved build scope in thin slices, and then hands off to test or review instead of self-certifying success.

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
3. Resolve the execution topology before editing.
   Default to sequential slice execution.
   Use bounded parallel fan-out only when the approved plan marks disjoint `parallel_candidate` slices, names `parallel_group` and `parallel_write_scope`, and supplies or accepts the default `max_parallel_subagents: 3`.
4. Slice the work before editing.
   Use `../../references/build-increments.md` to keep changes thin, reversible, and rollback-friendly.
   For multi-file or high-risk work, load `incremental-implementation`.
5. Build one slice or one bounded parallel wave at a time.
   For behavior changes, require RED-GREEN or a concrete failing signal.
   Use `../../references/testing-patterns.md` when test structure needs support.
6. Continue through the approved build scope.
   Keep moving slice-to-slice until the approved implementation scope for this stage is complete or the next unsatisfied need is no longer build.
   Do not stop after the first passing slice if more approved build slices remain.
   Only pause early for an explicit blocker, a requested checkpoint, or a real approval boundary already present in the artifacts.
7. Apply org standards during the slice.
   Respect `.aw_rules`, relevant platform playbooks, and the resolved GHL baseline.
   When context quality or scope focus is degrading, load `context-engineering`.
   For frontend work, load `../../references/frontend-quality-checklist.md`.
   For non-trivial UI work, load `frontend-ui-engineering`.
   For interface changes, load `../../references/interface-stability.md` and `api-and-interface-design`.
   For deprecation, removal, or migration slices, load `deprecation-and-migration`.
8. Record evidence and boundaries.
   Note what changed, what did not change, which slices or parallel waves are complete, which build slices still remain, and which checks were run.
   Use `../../references/git-save-points.md` when the work needs explicit save-point discipline.
   For meaningful completed slices, create focused save-point commits.
   For non-trivial commit boundaries, branch hygiene, or worktree isolation, load `git-workflow-and-versioning`.
9. Hand off cleanly.
   If build scope is complete, route to `aw-test` for QA proof or `aw-review` when the work needs findings, governance, or readiness decisions.
   If the work is blocked mid-build, name the blocker, the last completed slice, and the smallest safe next action instead of stopping with a vague pause.

## Completion Contract

Build is complete only when one of these is true:

- the approved implementation scope for the current stage is complete and written down
- a blocker prevents the next approved build slice and that blocker is named explicitly

A successful slice is a checkpoint, not an automatic terminal state.

Every build handoff must make these things obvious:

- what approved inputs were used
- which slices were completed
- whether work ran sequentially or in bounded parallel waves
- which build slices remain, if any
- which validation was run
- which save-point commits were created
- which exact next command should run next

Meaningful completed build slices must create save-point commits in git-capable workspaces.
If a slice cannot support a clean save-point commit, that is a planning problem and the slice should usually be merged with its dependent follow-up before build treats it as complete.
Parallel build fan-out must stay within the planned `max_parallel_subagents` cap, which defaults to `3` when the plan does not justify another number.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is small enough to do in one big patch." | Small tasks still benefit from thin slices and explicit validation. |
| "I'll add tests after the code is working." | If the behavior is testable, failure-first proof should lead the change. |
| "Frontend changes don't need special handling." | Responsive behavior, accessibility, and design-system compliance are part of the work. |
| "I can just clean up adjacent code too." | Scope creep makes rollback and review harder. |

## Red Flags

- a slice touches unrelated files
- a passing slice is treated as stage completion even though planned build work remains
- tests are hand-waved instead of run or explicitly declared unavailable
- the diff is large enough that rollback is unclear
- interface changes are made without boundary validation
- bugfix code appears before the failing signal is concrete

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "build"`
- `mode`
- `status`
- written artifacts
- inputs used
- files changed
- completed slices
- remaining slices
- parallel execution mode and cap when parallel build fan-out was used
- validation commands
- `save_point_commits`
- blockers or concerns
- recommended next commands

## Verification

Before leaving build, confirm:

- [ ] the change came from approved inputs or a clearly approved direct technical request
- [ ] the work was split into thin, reversible increments when non-trivial
- [ ] behavior changes have failing-signal evidence or a clear explanation of why not
- [ ] the approved build scope is either complete or blocked explicitly
- [ ] relevant org standards, platform playbooks, and `.aw_rules` were applied
- [ ] parallel execution, if used, stayed within the planned worker cap and disjoint write scopes
- [ ] meaningful completed slices produced recorded save-point commits
- [ ] `execution.md` and `state.json` are updated

## Final Output Shape

Always end with:

- `Mode`
- `Approved Inputs`
- `Parallelization`
- `Completed Slices`
- `Remaining Build Scope`
- `Changes`
- `Validation`
- `Save Points`
- `Blockers`
- `Next`
