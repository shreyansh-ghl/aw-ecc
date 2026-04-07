---
name: aw:verify
description: Compatibility entrypoint for the older verification stage. Route to aw:test, aw:review, or the smallest correct combined verification flow.
argument-hint: "<branch, PR, diff, artifact, or readiness request>"
status: active
stage: compatibility
internal_skill: aw-verify
---

# Verify

Use `/aw:verify` only as a compatibility entrypoint.
The canonical public model is now:

- `/aw:test` for QA and fresh evidence
- `/aw:review` for findings, governance, and readiness

## Role

Preserve legacy muscle memory while routing to the smallest correct modern verification flow.
This entrypoint inherits the same rule that the selected test or review scope should be completed or blocked explicitly before handoff.

## Compatibility Mapping

| Legacy intent | Canonical route |
|---|---|
| feature QA, regression proof, runtime validation | `/aw:test` |
| findings-oriented review, governance, readiness | `/aw:review` |
| broad "verify this" requests | `/aw:test -> /aw:review` when both are needed |

## Outputs

- `.aw_docs/features/<feature_slug>/verification.md`
- updated `.aw_docs/features/<feature_slug>/state.json`

## Must Not Do

- must not preserve the old overloaded verify semantics when a narrower stage is clear
- must not bypass fresh evidence requirements

## Recommended Next Commands

- `/aw:test`
- `/aw:review`
- `/aw:deploy`

## Final Output Shape

Always end with:

- `Compatibility Route`
- `Canonical Flow`
- `Evidence`
- `Outcome`
- `Next`
