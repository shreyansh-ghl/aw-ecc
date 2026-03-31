---
name: aw:execute
description: Build the approved work using the right execution mode and hand off cleanly to verification.
argument-hint: "<approved plan, spec, task, or implementation request>"
status: active
stage: execute
internal_skill: aw-execute
---

# Execute

Use `/aw:execute` to implement approved work.

This command owns implementation only. It does not replace planning, and it must not silently deploy.

## Role

Implement approved work using the correct execution mode and stop cleanly on blockers instead of guessing.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `code` | source code implementation | code changes, tests, `execution.md`, `state.json` |
| `infra` | Helm, Terraform, CI/CD, environment setup | infra/config changes, `execution.md`, `state.json` |
| `docs` | documentation-only work | docs changes, `execution.md`, `state.json` |
| `migration` | schema or data rollout | migration changes, rollback notes, `execution.md`, `state.json` |
| `config` | feature flags and runtime configuration | config changes, `execution.md`, `state.json` |

## Required Inputs

- approved planning artifact appropriate to the mode
- repo context
- relevant platform docs
- relevant `.aw_rules`

## Optional Inputs

- partial implementation
- existing branch or diff
- blocker notes from a previous run

## Outputs

- implementation changes
- tests or validation changes where applicable
- `.aw_docs/features/<feature_slug>/execution.md`
- updated `.aw_docs/features/<feature_slug>/state.json`

## Execution Rules

1. Load the approved planning input before changing code.
2. Review the approved plan critically before starting implementation.
3. If the plan is underspecified, contradictory, or missing a critical dependency, stop and route back to `/aw:plan`.
4. Run the hidden preparation gate first when repo state, isolation, or baseline setup could affect safe execution.
5. Select the execution mode explicitly.
6. Break non-trivial work into explicit task units.
7. Implement in dependency order, one task unit at a time.
8. Mark the active task unit in progress, then completed only after validation.
9. Run a spec-compliance review before marking a task unit complete.
10. Run a code-quality review before handing off.
11. Hand off to `/aw:verify` instead of claiming readiness without evidence.

## Internal Task Loop

For multi-step execution, `/aw:execute` should internally use:

- `task_unit` planning for the next implementation slice
- `context_pack` limited to the files and artifacts needed for that slice
- explicit worker ownership for non-trivial task units
- `spec_review` after the implementation step
- `quality_review` before handoff

Task units may be parallelizable internally, but the public contract remains one `/aw:execute` stage.
When the task loop needs concrete worker assets, generate them with `node skills/aw-execute/scripts/build-worker-bundle.js --feature <slug> --tasks-file .aw_docs/features/<slug>/tasks.md` and use the repo-local worker reference files.

## Test Discipline

For code changes:

- prefer test-first or failure-first work where feasible
- Verify RED before broad code changes
- Verify GREEN before moving to the next task unit
- do not claim completion for a behavioral change without naming the relevant tests or explaining why they were unavailable
- record test limitations explicitly when the repo cannot support the desired validation
- for non-trivial behavior changes, record a concrete failing signal or equivalent reproduction before broad fixes

## Hard Gates

- execution requires approved planning input
- blockers must be reported explicitly
- repeated failure must stop guessing and surface the blocker
- task-unit completion requires spec and quality review notes
- do not guess through a broken plan when `/aw:plan` should be revisited

## Must Not Do

- must not re-enter planning unless a true prerequisite is missing
- must not silently skip tests for code changes
- must not deploy as part of execution

## Recommended Next Commands

- `/aw:verify`

## Internal Routing

Implementation should use `aw-execute`, may invoke `aw-prepare` as an internal setup gate, and may load domain skills based on the work being changed.

## Final Output Shape

Always end with:

- `Mode`
- `Task Units`
- `Worker Roles`
- `Changes`
- `Validation`
- `Blockers`
- `Next`
