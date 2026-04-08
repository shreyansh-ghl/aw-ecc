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
   For any slice that changes observable behavior, fixes a bug, or refactors live behavior, load `tdd-guide` and require explicit RED-GREEN-REFACTOR (RED -> GREEN -> REFACTOR).
   For config, docs, infra, migration, or other non-behavior slices where test-first is not meaningful, record the best pre-change proof available before editing and the focused post-change validation that will prove the slice.
   During implementation, prefer the simplest change that fits existing patterns.
   Avoid speculative abstractions, unnecessary branching, and adjacent cleanup outside the approved slice.
   When the working code feels heavier than necessary, load `code-simplification` before save-pointing the slice.
   Use `../../references/testing-patterns.md` when test structure needs support.
6. Review and simplify the completed slice before advancing.
   Once a slice is green, run a focused chunk review before advancing.
   Prefer the language or runtime reviewer agent when one matches the touched code (`typescript-reviewer`, `python-reviewer`, `java-reviewer`, `kotlin-reviewer`, `go-reviewer`, `rust-reviewer`, `cpp-reviewer`, or `flutter-reviewer`).
   Otherwise use `code-reviewer`.
   Use the `aw-review` axes for chunk review scope: correctness, readability and simplicity, architecture, security, and performance.
   Keep this review scoped to the current slice rather than treating it as a full stage handoff.
   Use `../../references/review-findings-severity.md` for chunk findings language.
   For readability and maintainability concerns, load `code-simplification`.
   Fix blocking findings inside the same slice before moving on.
   Advisory findings may be deferred only when written down in `execution.md` and `state.json` with explicit rationale.
   Before declaring the slice complete, check whether code can be deleted, branches reduced, names clarified, or existing patterns reused without broadening scope.
7. Continue through the approved build scope.
   Keep moving slice-to-slice until the approved implementation scope for this stage is complete or the next unsatisfied need is no longer build.
   Do not stop after the first passing slice if more approved build slices remain.
   Only pause early for an explicit blocker, a requested checkpoint, or a real approval boundary already present in the artifacts.
8. Apply org standards during the slice.
   Respect `.aw_rules`, relevant platform playbooks, and the resolved GHL baseline.
   When context quality or scope focus is degrading, load `context-engineering`.
   For frontend work, load `../../references/frontend-quality-checklist.md`.
   For non-trivial UI work, load `frontend-ui-engineering`.
   For interface changes, load `../../references/interface-stability.md` and `api-and-interface-design`.
   For deprecation, removal, or migration slices, load `deprecation-and-migration`.
9. Record evidence and boundaries.
   Note what changed, what did not change, which slices or parallel waves are complete, which build slices still remain, and which checks were run.
   For each completed slice, note that focused review ran and what simplification was applied or intentionally deferred.
   When the approved tasks are grouped into phases, record phase transitions explicitly: which phase completed, which phase is now active, and what remains in later phases.
   Use `../../references/git-save-points.md` when the work needs explicit save-point discipline.
   For meaningful completed slices, create focused save-point commits.
   For non-trivial commit boundaries, branch hygiene, or worktree isolation, load `git-workflow-and-versioning`.
10. Hand off cleanly.
   If build scope is complete, route to `aw-test` for QA proof or `aw-review` when the work needs findings, governance, or readiness decisions.
   If the work is blocked mid-build, name the blocker, the last completed slice, and the smallest safe next action instead of stopping with a vague pause.

## Completion Contract

Build is complete only when one of these is true:

- the approved implementation scope for the current stage is complete and written down
- a blocker prevents the next approved build slice and that blocker is named explicitly

A successful slice is a checkpoint, not an automatic terminal state.

Every build handoff must make these things obvious:

- what approved inputs were used
- which phases were completed, if the approved plan used phases
- which phase is current or next, if phased execution is still in flight
- which slices were completed
- whether work ran sequentially or in bounded parallel waves
- what pre-change proof was used for each completed slice
- which build slices remain, if any
- which validation was run
- which reviewer agent reviewed each completed slice
- whether focused chunk review ran before advancing
- what simplification was applied per completed slice
- which findings were fixed versus explicitly deferred
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
| "I'll simplify after all chunks are done." | Complexity compounds across slices; simplify while the current chunk is still local and reviewable. |
| "I'll review the whole thing at the end." | Focused chunk review catches correctness and complexity issues before they spread into later slices. |
| "Frontend changes don't need special handling." | Responsive behavior, accessibility, and design-system compliance are part of the work. |
| "I can just clean up adjacent code too." | Scope creep makes rollback and review harder. |

## Red Flags

- a slice touches unrelated files
- a passing slice is treated as stage completion even though planned build work remains
- tests are hand-waved instead of run or explicitly declared unavailable
- a slice advances without a focused review after reaching green
- complexity is knowingly deferred into later chunks without an explicit reason
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
- `completed_phases` when the approved plan used phases
- `current_phase` for the active or next build phase when phase sequencing exists
- completed slices
- remaining slices
- parallel execution mode and cap when parallel build fan-out was used
- pre-change proof notes
- validation commands
- reviewer agents used
- slice review notes
- blocking findings
- deferred findings
- simplification notes
- `save_point_commits`
- blockers or concerns
- recommended next commands

## Verification

Before leaving build, confirm:

- [ ] the change came from approved inputs or a clearly approved direct technical request
- [ ] the work was split into thin, reversible increments when non-trivial
- [ ] behavior-changing slices used explicit RED -> GREEN -> REFACTOR via `tdd-guide`
- [ ] non-behavior slices recorded pre-change proof and focused post-change validation
- [ ] each meaningful completed slice reached green before the next slice started
- [ ] each meaningful completed slice had a focused review with the right reviewer agent before the next slice started
- [ ] simplification was applied inside the touched scope before save-pointing the slice
- [ ] the approved build scope is either complete or blocked explicitly
- [ ] relevant org standards, platform playbooks, and `.aw_rules` were applied
- [ ] parallel execution, if used, stayed within the planned worker cap and disjoint write scopes
- [ ] phased plans, if used, recorded phase completion plus the next phase transition
- [ ] meaningful completed slices produced recorded save-point commits
- [ ] `execution.md` and `state.json` are updated

## Final Output Shape

Always end with:

- `Mode`
- `Approved Inputs`
- `Parallelization`
- `Phase Progress`
- `Completed Slices`
- `Remaining Build Scope`
- `Changes`
- `Validation`
- `Chunk Reviews`
- `Simplification`
- `Save Points`
- `Blockers`
- `Next`
