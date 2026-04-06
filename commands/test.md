---
name: aw:test
description: Produce fresh QA evidence for a feature, bugfix, or release scope using the resolved repo and org quality gates.
argument-hint: "<feature, fix, branch, diff, artifact, or release scope>"
status: active
stage: test
internal_skill: aw-test
---

# Test

Use `/aw:test` to prove the requested scope works with current evidence.

## Role

Run the smallest correct QA scope for the requested feature, fix, or release and write the evidence down clearly enough for review and deploy to trust it.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `feature` | validating a scoped implementation | `verification.md`, `state.json` |
| `bugfix` | proving a repaired behavior and regression guard | `verification.md`, `state.json` |
| `release` | validating the broader release-ready scope | `verification.md`, `state.json` |
| `ui-runtime` | frontend runtime, responsive, and interaction proof | `verification.md`, `state.json` |

## Outputs

- `.aw_docs/features/<feature_slug>/verification.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- fresh evidence for local validation, E2E, external validation, or targeted runtime checks

## QA Rules

1. Select the smallest correct test scope, not the loudest available suite.
2. Inherit the resolved GHL baseline profile for local validation, E2E, sandbox, and quality-gate expectations.
3. For bugfixes, prove the failing signal and the regression guard.
4. For frontend work, include responsive, accessibility-aware, and runtime evidence when relevant.
5. Mark unavailable checks as unavailable instead of inventing a pass.
6. Hand off to `/aw:review` when findings, governance, or readiness still need a decision.

## Must Not Do

- must not silently reuse stale evidence after code changed
- must not implement code while testing
- must not collapse feature QA and release readiness into one vague summary

## Recommended Next Commands

- `/aw:review`
- `/aw:build` if a failure requires repair

## Final Output Shape

Always end with:

- `Mode`
- `Scope`
- `Checks Run`
- `Evidence`
- `Failures`
- `Next`
