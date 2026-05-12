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
- `.aw_docs/html/<feature_slug>-build/index.html` when the routed `/aw:build` stage writes an HTML companion

## Human HTML Companion

`/aw:execute` inherits the `/aw:build` HTML companion contract.
Markdown remains canonical for agents, and `aw:echo` produces the human review companion when output mode is `dual` or `html`.

## Must Not Do

- must not drift into a separate execute-only workflow
- must not bypass the newer build, test, review, deploy, and ship stage definitions

## Recommended Next Commands

- `/aw:test`
- `/aw:review`

## Final Output Shape

Always end with:

- `Compatibility Route`
- `Canonical Stage`
- `Changes`
- `Validation`
- `HTML Companion`
- `Next`
