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
2. Run the hidden preparation gate first when repo state, isolation, or baseline setup could affect safe execution.
3. Select the execution mode explicitly.
4. Break non-trivial work into explicit task units.
5. Implement in dependency order, one task unit at a time.
6. Run a spec-compliance review before marking a task unit complete.
7. Run a code-quality review before handing off.
8. Hand off to `/aw:verify` instead of claiming readiness without evidence.

## Internal Task Loop

For multi-step execution, `/aw:execute` should internally use:

- `task_unit` planning for the next implementation slice
- `context_pack` limited to the files and artifacts needed for that slice
- `spec_review` after the implementation step
- `quality_review` before handoff

Task units may be parallelizable internally, but the public contract remains one `/aw:execute` stage.

## Test Discipline

For code changes:

- prefer test-first or failure-first work where feasible
- do not claim completion for a behavioral change without naming the relevant tests or explaining why they were unavailable
- record test limitations explicitly when the repo cannot support the desired validation

## Hard Gates

- execution requires approved planning input
- blockers must be reported explicitly
- repeated failure must stop guessing and surface the blocker
- task-unit completion requires spec and quality review notes

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
- `Changes`
- `Validation`
- `Blockers`
- `Next`
