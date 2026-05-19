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
- `.aw_docs/features/<feature_slug>/verification.html` and/or `.aw_docs/features/<feature_slug>/verification.html` when the routed stage writes an HTML companion

## Human HTML Companion

`/aw:verify` inherits the `/aw:test` and `/aw:review` HTML companion contracts.
Markdown remains canonical for agents, and `platform-core:human-collaboration-artifacts` produces the human review companion when output mode is `dual` or `html`.
Skill authorization: invoking `/aw:verify` in `dual` or `html` output mode is an explicit user request to run `platform-core:human-collaboration-artifacts` for the human-facing HTML companion. When the harness can spawn subagents, this also authorizes exactly one background `aw:echo` subagent, scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Run `platform-core:human-collaboration-artifacts` and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. Record the companion as `queued` or `generating` while an optional Echo subagent runs. If the tool layer cannot spawn `aw:echo`, continue in-process with the HCA skill; do not create stage-local fallback HTML. Record `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and the Echo availability reason when HCA generates directly. If HCA itself cannot safely generate, record `status: blocked`, `publish_status: blocked`, and the exact blocker in `state.json`.

## Must Not Do

- must not preserve the old overloaded verify semantics when a narrower stage is clear
- must not bypass fresh evidence requirements

## Recommended Next Commands

- `/aw:test`
- `/aw:review`
- `/aw:deploy`

## HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, invoke `platform-core:human-collaboration-artifacts` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` companion job. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish config or publisher internals in this stage. Add HCA/Echo returned links to the final `Remote Docs` section. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Compatibility Route`
- `Canonical Flow`
- `Evidence`
- `Outcome`
- `HTML Companion`
- `Remote Docs`
- `Next`
