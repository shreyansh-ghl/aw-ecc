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
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, create a conservative self-contained fallback HTML sidecar in the same turn, record `generated_fallback` with the blocker, and keep Markdown canonical.

## Must Not Do

- must not drift into a separate execute-only workflow
- must not bypass the newer build, test, review, deploy, and ship stage definitions

## Recommended Next Commands

- `/aw:test`
- `/aw:review`

## Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not run docs publish commands in this stage. Add Echo's returned links to the final `Remote Docs` section. If Echo cannot generate or publish, record `publish_status: blocked` and Echo's blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Compatibility Route`
- `Canonical Stage`
- `Changes`
- `Validation`
- `HTML Companion`
- `Remote Docs`
- `Next`
