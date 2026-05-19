---
name: aw:execute
description: Compatibility entrypoint for the old implementation stage. Route to aw:build and keep the same artifact discipline.
argument-hint: "<approved plan, spec, task, or implementation request>"
status: active
stage: compatibility
internal_skill: aw-build
---

# Execute

Use `/aw:execute` only as a compatibility entrypoint.
The canonical implementation stage is `/aw:build`.

## Role

Preserve legacy muscle memory while routing to the modern build contract.
Do not introduce a second implementation workflow.
This entrypoint inherits the same rule that build should finish the approved build scope or block explicitly before handing off.

## Routing Rule

- approved implementation work -> follow `/aw:build`
- bugfixes with unclear root cause -> prefer `/aw:investigate` first, then return to `/aw:build`
- old `/aw:tdd` expectations -> stay inside `/aw:build` and its RED-GREEN discipline

## Outputs

- implementation changes
- `.aw_docs/features/<feature_slug>/execution.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- `.aw_docs/features/<feature_slug>/execution.html` when the routed `/aw:build` stage writes an HTML companion

## Human HTML Companion

`/aw:execute` inherits the `/aw:build` HTML companion contract.
Markdown remains canonical for agents, and the `aw:echo` subagent produces the human review companion when output mode is `dual` or `html`.
Subagent authorization: invoking `/aw:execute` in `dual` or `html` output mode is an explicit user request to delegate the human-facing HTML companion to exactly one background `aw:echo` subagent. This authorization is scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, load `platform-core:human-collaboration-artifacts` and run direct HCA execution in the same turn. Do not freehand or command-template HTML outside that skill contract. Record successful direct HCA execution as `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and `echo_agent_status: unavailable` with the exact Echo availability reason; do not record successful HCA output as `generated_fallback` or `generated_hca_fallback`. Keep Markdown canonical and include HCA/Echo provenance in the final handoff.

## Must Not Do

- must not drift into a separate execute-only workflow
- must not bypass the newer build, test, review, deploy, and ship stage definitions

## Recommended Next Commands

- `/aw:test`
- `/aw:review`

## HCA/Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish commands or publish configuration in this stage. The HCA/Echo handoff owns HTML generation and remote sharing. Before the final response, inspect the HCA/Echo handoff result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute URLs, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: <absolute repository URL>` when HCA/Echo returns or records both; never collapse them to bare `TeamOfOne` and `GitHub` labels, Markdown-only hidden links, or any other shorthand without visible URL strings. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Compatibility Route`
- `Canonical Stage`
- `Changes`
- `Validation`
- `HTML Companion`
- `Remote Docs`
- `Next`
