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
Markdown remains canonical for agents, and the `aw:echo` subagent produces the human review companion when output mode is `dual` or `html`.
Subagent authorization: invoking `/aw:verify` in `dual` or `html` output mode is an explicit user request to delegate the human-facing HTML companion to exactly one background `aw:echo` subagent. This authorization is scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, or if the user asks for skill-only/direct Echo, load `platform-core:echo-direct` when available and otherwise load `platform-core:human-collaboration-artifacts`; run direct HCA execution in the same turn. Do not freehand or command-template HTML outside that skill contract. Record successful direct HCA execution as `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, optional `runner: platform-core:echo-direct`, and `echo_agent_status: unavailable` with the exact Echo availability reason; when `platform-core:echo-direct` runs as the same-turn fast path, record `echo_agent_status: in_process_fast_path`; do not record successful HCA output as `generated_fallback` or `generated_hca_fallback`. Keep Markdown canonical and include HCA/Echo provenance in the final handoff.

## Must Not Do

- must not preserve the old overloaded verify semantics when a narrower stage is clear
- must not bypass fresh evidence requirements

## Recommended Next Commands

- `/aw:test`
- `/aw:review`
- `/aw:deploy`

## HCA/Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only, Markdown-only, or skill-only/direct Echo docs. For skill-only/direct Echo runs, use `platform-core:echo-direct` when available and otherwise run direct HCA in the same turn. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish commands or publish configuration in this stage. The HCA/Echo handoff owns HTML generation and remote sharing. Before the final response, inspect the HCA/Echo handoff result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute TeamOfOne URLs with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: [spec.html](<absolute repository URL>)` (or another short artifact label) when HCA/Echo returns or records both; never collapse them to bare `TeamOfOne` and `GitHub` labels, hide the TeamOfOne URL behind Markdown-only links, or print long GitHub URLs inline when a compact label can point to the same URL. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Compatibility Route`
- `Canonical Flow`
- `Evidence`
- `Outcome`
- `HTML Companion`
- `Remote Docs`
- `Next`
