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

Markdown `execution.md` remains canonical for agents.
When `/aw:execute` routes to `/aw:build` and writes or materially updates execution evidence, HTML sidecars are required in `dual` and `html` output modes. Use `platform-core:echo-direct` directly to generate or refresh `.aw_docs/features/<feature_slug>/execution.html` with the `implementation-plan` profile.

Resolve docs output mode in this order: explicit user or session request, stage-local request, `.aw_docs/config.json` `docs.outputMode`, `AW_DOCS_OUTPUT_MODE`, then default `dual`.
- `dual` mode keeps Markdown canonical and requires the HTML companion.
- `html` mode requires the HTML companion and still preserves any canonical Markdown the stage must write.
- explicit Markdown-only mode skips HTML and records `status: skipped` with `skip_reason: explicit_markdown_only`.

Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`. In `dual` or `html` mode, the stage is not complete until the skill has generated the sidecar or recorded a concrete blocker. In explicit Markdown-only mode, do not generate HTML.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, `status: generated` when successful, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason. Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.

## Must Not Do

- must not drift into a separate execute-only workflow
- must not bypass the newer build, test, review, deploy, and ship stage definitions

## Recommended Next Commands

- `/aw:test`
- `/aw:review`

## Echo Direct Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for every required human companion in `dual` or `html` mode. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent. This same skill is also the repair path for existing folders with missing, stale, blocked, local-only, legacy uncontrolled fallback, unpublished, or linkless companions.

Do not duplicate docs publish commands or publish configuration in this stage. `platform-core:echo-direct` owns HTML generation, publish handoff, companion state updates, and returned Devtools/GitHub links. Before the final response, inspect the skill result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as plain-text absolute Devtools URLs rooted at `https://devtools.servers.stg.msgsndr.net/` (no Markdown link syntax around the Devtools URL) with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `Devtools: <absolute remote URL>` as raw visible text and `GitHub: [spec.html](<absolute repository URL>)` or another short artifact label when both URLs are available. Never render Devtools as `[Devtools](...)`, `[Spec Devtools](...)`, or any other Markdown link label; never hide the Devtools URL behind Markdown-only links, never print long GitHub URLs inline when a compact label can point to the same URL, and never invent links. If publishing cannot run, record `publish_status: blocked` and the concrete blocker in `state.json`.

## Final Output Shape

Always end with:

- `Compatibility Route`
- `Canonical Stage`
- `Changes`
- `Validation`
- `HTML Companion`
- `Remote Docs`
- `Next`
