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
2. Select the execution mode explicitly.
3. Implement in dependency order.
4. Review the output against the spec and quality rules before handing off.
5. Hand off to `/aw:verify` instead of claiming readiness without evidence.

## Hard Gates

- execution requires approved planning input
- blockers must be reported explicitly
- repeated failure must stop guessing and surface the blocker

## Must Not Do

- must not re-enter planning unless a true prerequisite is missing
- must not silently skip tests for code changes
- must not deploy as part of execution

## Recommended Next Commands

- `/aw:verify`

## Internal Routing

Implementation should use `aw-execute` and may load domain skills based on the work being changed.

## Final Output Shape

Always end with:

- `Mode`
- `Changes`
- `Validation`
- `Blockers`
- `Next`
