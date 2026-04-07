---
name: aw:build
description: Build approved work in thin, reversible increments using the resolved org standards and the smallest correct validation loop.
argument-hint: "<approved plan, spec, task, or implementation request>"
status: active
stage: build
internal_skill: aw-build
---

# Build

Use `/aw:build` to implement approved work.

This command owns implementation only.
It does not replace planning, and it must not silently deploy.

## Role

Implement approved work in thin, reversible slices, continue until the approved build scope is complete or blocked, then hand off cleanly to test and review instead of self-declaring success.

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
- resolved GHL baseline profile when it affects validation or rollout safety

## Outputs

- implementation changes
- tests or validation changes where applicable
- `.aw_docs/features/<feature_slug>/execution.md`
- updated `.aw_docs/features/<feature_slug>/state.json`

## Execution Rules

1. Load the approved planning input before changing code.
2. If the plan is underspecified, contradictory, or missing a critical dependency, stop and route back to `/aw:plan`.
3. Select the execution mode explicitly.
4. Default to sequential execution unless the approved plan marks disjoint `parallel_candidate` slices with explicit write scopes.
5. If parallel fan-out is approved, respect the plan’s `max_parallel_subagents` cap, defaulting to `3` when no stricter or larger value is justified.
6. Break non-trivial work into thin, rollback-friendly slices or bounded parallel waves.
7. Validate each slice or completed wave before expanding scope.
8. Keep moving through approved slices until the current build scope is complete or explicitly blocked.
9. For bug work, require a failing signal or reproduction before broad fixes.
10. For frontend work, inherit HighRise, accessibility, responsive, and runtime-verification expectations.
11. Record what changed, what remains, whether execution stayed sequential or ran in bounded parallel waves, and what was intentionally not touched.
12. Create save-point commits for meaningful completed slices.
13. If a proposed slice cannot support a clean save-point commit, treat that as a slicing problem instead of normalizing a no-commit checkpoint.
14. Hand off to `/aw:test` or `/aw:review` with the exact next command instead of claiming readiness without evidence.

## Must Not Do

- must not reopen planning unless a true prerequisite is missing
- must not silently skip tests for code changes
- must not stop after a successful slice if approved build work still remains
- must not deploy as part of build

## Recommended Next Commands

- `/aw:test`
- `/aw:review`

## Final Output Shape

Always end with:

- `Mode`
- `Approved Inputs`
- `Parallelization`
- `Increment Plan`
- `Completed Slices`
- `Remaining Build Scope`
- `Changes`
- `Validation`
- `Save Points`
- `Blockers`
- `Next`
