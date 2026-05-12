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
- `.aw_docs/html/<feature_slug>-test/index.html` when docs output mode is `dual` or `html`
- fresh evidence for local validation, E2E, external validation, or targeted runtime checks

## Human HTML Companion

Markdown `verification.md` remains canonical for agents.
When `/aw:test` writes or materially updates QA evidence, invoke `platform-core:human-collaboration-artifacts` and delegate the human-facing HTML generation to `aw:echo` with the `verification-report` profile unless the resolved output mode is Markdown-only.

Record `html_companion_artifacts` in `state.json` with path, profile, status, and skipped or blocked reason.

## QA Rules

1. Select the smallest correct test scope, not the loudest available suite.
2. Inherit the resolved GHL baseline profile for local validation, E2E, sandbox, and quality-gate expectations.
3. For bugfixes, prove the failing signal and the regression guard.
4. For frontend work, include responsive, accessibility-aware, and runtime evidence when relevant.
5. Continue until the requested QA scope is covered or explicitly blocked.
6. Mark unavailable checks as unavailable instead of inventing a pass.
7. Hand off to `/aw:review` when findings, governance, or readiness still need a decision.
8. Generate or explicitly record the HTML companion status before handoff.

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
- `Unavailable`
- `HTML Companion`
- `Next`
