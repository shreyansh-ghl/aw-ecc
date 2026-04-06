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

Implement approved work in thin, reversible slices, then hand off cleanly to test and review instead of self-declaring success.

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
4. Break non-trivial work into thin, rollback-friendly slices.
5. Validate each slice before expanding scope.
6. For bug work, require a failing signal or reproduction before broad fixes.
7. For frontend work, inherit HighRise, accessibility, responsive, and runtime-verification expectations.
8. Record what changed and what was intentionally not touched.
9. Hand off to `/aw:test` or `/aw:review` instead of claiming readiness without evidence.

## Must Not Do

- must not reopen planning unless a true prerequisite is missing
- must not silently skip tests for code changes
- must not deploy as part of build

## Recommended Next Commands

- `/aw:test`
- `/aw:review`

## Final Output Shape

Always end with:

- `Mode`
- `Increment Plan`
- `Changes`
- `Validation`
- `Blockers`
- `Next`
