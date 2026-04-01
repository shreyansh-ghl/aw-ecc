---
name: aw-execute
description: Implement approved work from `.aw_docs/features/<feature_slug>/` planning artifacts and write deterministic execution evidence.
trigger: User requests implementation of approved work, or `/aw:ship` needs to move from planning into implementation.
---

# AW Execute

## Purpose

`aw-execute` owns implementation only.
It reads approved planning inputs, may run `aw-prepare` as a hidden setup gate, uses `aw-debug` when bug work is still uncertain, makes the minimum correct changes, runs the relevant local checks when possible, and writes execution evidence.
For non-trivial work, it should behave like a bounded internal worker system rather than one long undifferentiated implementation step.

## Inputs

Preferred approved inputs live under:

- `.aw_docs/features/<feature_slug>/spec.md`
- `.aw_docs/features/<feature_slug>/tasks.md`
- `.aw_docs/features/<feature_slug>/design.md`
- `.aw_docs/features/<feature_slug>/prd.md`

If the user supplies an already-approved direct technical request, use that as the execution input without forcing unrelated artifacts.

## Execution Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `code` | source code implementation is required | code changes, tests, `execution.md`, `state.json` |
| `infra` | Helm, Terraform, CI/CD, or runtime setup changes are required | infra/config changes, `execution.md`, `state.json` |
| `docs` | documentation-only work is required | docs changes, `execution.md`, `state.json` |
| `migration` | schema or data rollout work is required | migration changes, rollback notes, `execution.md`, `state.json` |
| `config` | feature flags or runtime configuration are required | config changes, `execution.md`, `state.json` |

## Required Behavior

Always:

1. load the approved execution input
2. critically review the approved input before changing code
3. if the plan has a critical gap, contradiction, or missing dependency, stop and route back to `aw-plan`
4. choose the smallest correct execution mode
5. break non-trivial work into explicit task units
6. package the minimum correct context for the current task unit instead of reopening the entire plan every time
7. when the work is a bug fix or failing-behavior repair, capture reproduction and root-cause evidence before patching
8. assign clear internal ownership for the current task unit
9. implement the required change without reopening planning
10. run a `spec_review` before marking a task unit complete
11. run a `quality_review` before handing off
12. run relevant local validation commands when available
13. write `.aw_docs/features/<feature_slug>/execution.md`
14. update `.aw_docs/features/<feature_slug>/state.json`
15. hand off to `aw-verify`

## Plan Intake Review

Before execution starts, review the approved input critically.

Stop and route back to planning when the plan has any of these problems:

- missing file scope for a non-trivial task
- undefined helper, interface, type, or command
- contradictory instructions across `spec.md`, `tasks.md`, or `design.md`
- no meaningful failing signal for a behavioral change when the repo can support one
- hidden dependency or environment assumption that execution would have to guess

Execution should not "fill in the blanks" on critical plan gaps.

## Task-Unit Orchestration

When the execution input implies more than one meaningful step, use this internal loop:

1. identify the next task unit
2. mark it as `in_progress`
2. name the task goal, affected files, and required inputs
3. follow the approved task steps exactly when `tasks.md` provides step-level instructions
4. build only that unit
5. run `spec_review`
6. run `quality_review`
7. either mark the unit complete or stop on a named blocker
8. mark completed units explicitly before moving on

Independent units may be flagged as `parallel_candidate`, but the public surface remains a single `/aw:execute` stage.

## Internal Worker Roles

For non-trivial work, treat execution as four bounded internal roles:

- `implementer` owns the current code or config change
- `spec_reviewer` checks the task unit against the approved spec
- `quality_reviewer` checks maintainability, reliability, and stage readiness
- `parallel_worker` is optional and only valid when the write scope is safely disjoint

These roles stay inside `/aw:execute`.
They must not become new public commands.

## Worker Runtime Assets

The internal worker system must be backed by repo-local runtime assets instead of prose alone:

- `skills/aw-execute/references/worker-implementer.md`
- `skills/aw-execute/references/worker-spec-reviewer.md`
- `skills/aw-execute/references/worker-quality-reviewer.md`
- `skills/aw-execute/references/worker-parallel-worker.md`
- `node skills/aw-execute/scripts/build-worker-bundle.js --feature <slug> --tasks-file .aw_docs/features/<slug>/tasks.md`

For non-trivial work, generate a worker bundle before dispatch so each task unit has:

- explicit role prompts
- bounded task-unit ownership
- review ordering
- optional orchestration-plan output for parallel candidates

## Runtime Discipline

When task units are independent enough to run in parallel:

- assign disjoint file ownership first
- do not let parallel workers edit the same file set
- keep the context pack limited to the current task unit
- merge back into a single execution record with explicit ownership notes
- prefer a generated worker bundle over ad hoc hand-written sub-prompts

When work is not clearly independent, stay sequential.

## TDD Policy

For code changes, use explicit RED-GREEN-REFACTOR or failure-first behavior wherever the repo can support it.

The iron law is:

`NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST`

When a runnable automated test is practical:

- write the failing test first
- Verify RED by watching it fail for the expected reason
- write the minimal change
- Verify GREEN by rerunning the relevant checks and confirming the expected pass
- refactor only after green

- reuse an existing failing test if it already captures the bug
- add or update the smallest correct automated test when the behavior is testable
- capture a concrete failing signal before broad behavior changes whenever the repo can support it
- record the `RED` signal, the minimal `GREEN` change, and any `REFACTOR` follow-up in `execution.md`
- record test limitations in `execution.md` instead of silently skipping them
- when a new failing automated test is not practical, record the reproduction signal and why that was the smallest correct substitute
- if production code was written before the failing signal existed, do not treat that as compliant TDD; rewrite the slice from the failing signal forward

For bug-oriented work, use `aw-debug` to drive:

- reproduction
- expected vs actual behavior
- root-cause hypothesis
- confirming probe before broad fixes

## When to Stop and Ask for Help

Stop execution instead of guessing when:

- a dependency or environment prerequisite is missing
- the approved plan cannot be executed as written
- verification fails repeatedly on the same task unit
- the root cause is still unclear after the next confirming probe
- the work would require coding directly on `main` or `master` without explicit consent

## Hard Gates

- do not invent product or design work during execution
- stop cleanly on blockers instead of guessing
- do not deploy from `aw-execute`
- do not silently skip tests when the repo has runnable checks
- do not mark multi-step work complete without recording task-unit progress
- do not skip `aw-prepare` when repo state could make execution unsafe
- do not claim a bug is fixed without either a failing-test signal or an equivalent reproduction signal
- do not skip the debugging trail when the root cause was initially uncertain
- do not run overlapping parallel workers on the same write scope
- do not leave worker ownership implicit for non-trivial task units
- do not push through critical plan gaps that should have sent the work back to planning

## Execution Report

`execution.md` should capture:

- selected mode
- approved inputs used
- task units completed
- worker ownership for each non-trivial task unit
- spec review and quality review outcomes
- RED-GREEN-REFACTOR or failure-first evidence when code behavior changed
- debugging trace when bug work required root-cause isolation
- files changed
- key implementation notes
- commands run
- blockers or concerns
- recommended next stage

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "execute"`
- `mode`
- `status`
- plan intake result
- completed task units
- pending task units or blockers
- written artifacts
- key validation commands
- recommended next commands

## Final Output Shape

Always end with:

- `Selected Mode`
- `Task Loop`
- `Worker Roles`
- `Inputs Used`
- `Files Changed`
- `Validation Run`
- `Blockers`
- `Recommended Next`
