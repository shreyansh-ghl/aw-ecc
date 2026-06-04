---
name: aw:review
description: Review the work for findings, governance, and readiness using explicit severity language and the resolved org standards.
argument-hint: "<branch, PR, diff, artifact, or readiness request>"
status: active
stage: review
internal_skill: aw-review
---

# Review

Use `/aw:review` to turn evidence into findings, readiness, and a clear next decision.

## Role

Review the work across correctness, simplicity, architecture, security, performance, governance, and release readiness.
This stage may request or rerun targeted tests when existing evidence is stale, missing, or too broad.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `findings` | code and implementation review is the main goal | `verification.md`, `state.json` |
| `governance` | PR checklist, approvals, and status checks matter most | `verification.md`, `state.json` |
| `readiness` | a release recommendation is needed | `verification.md`, `state.json` |

## Outputs

- `.aw_docs/features/<feature_slug>/verification.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- `.aw_docs/features/<feature_slug>/verification.html` when docs output mode is `dual` or `html`
- explicit overall status: `PASS`, `PASS_WITH_NOTES`, or `FAIL`

## Human HTML Companion

Markdown `verification.md` remains canonical for agents.
When `/aw:review` writes or materially updates review, governance, or readiness evidence, HTML sidecars are required in `dual` and `html` output modes. Use `platform-core:echo-direct` directly to generate or refresh `.aw_docs/features/<feature_slug>/verification.html` with the `pr-one-pager` or `impact-analysis-report` profile.

Resolve docs output mode in this order: explicit user or session request, stage-local request, `.aw_docs/config.json` `docs.outputMode`, `AW_DOCS_OUTPUT_MODE`, then default `dual`.
- `dual` mode keeps Markdown canonical and requires the HTML companion.
- `html` mode requires the HTML companion and still preserves any canonical Markdown the stage must write.
- explicit Markdown-only mode skips HTML and records `status: skipped` with `skip_reason: explicit_markdown_only`.

Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`. In `dual` or `html` mode, the stage is not complete until the skill has generated the sidecar or recorded a concrete blocker. In explicit Markdown-only mode, do not generate HTML.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, `status: generated` when successful, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason. Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.

## Review Rules

1. Review tests and validation evidence first.
2. Classify findings with explicit severity and evidence.
3. Load platform review, design, accessibility, and quality-gate playbooks when the baseline requires them.
4. Keep blocking findings separate from advisory notes.
5. Continue until the requested findings, governance, and readiness scope is covered or explicitly blocked.
6. Route back to `/aw:build` when repair is needed.
7. Do not clear findings on stale evidence.
8. Generate or explicitly record the HTML companion status before handoff.

## Must Not Do

- must not hide blocking findings inside summary prose
- must not implement code while reviewing
- must not treat reviewer agreement as evidence

## Recommended Next Commands

- `/aw:deploy`
- `/aw:build`

## Echo Direct Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for every required human companion in `dual` or `html` mode. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent. This same skill is also the repair path for existing folders with missing, stale, blocked, local-only, legacy uncontrolled fallback, unpublished, or linkless companions.

Do not duplicate docs publish commands or publish configuration in this stage. `platform-core:echo-direct` owns HTML generation, publish handoff, companion state updates, and returned Devtools/GitHub links. Before the final response, inspect the skill result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as plain-text absolute Devtools URLs rooted at `https://devtools.servers.stg.msgsndr.net/` (no Markdown link syntax around the Devtools URL) with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `Devtools: <absolute remote URL>` as raw visible text and `GitHub: [spec.html](<absolute repository URL>)` or another short artifact label when both URLs are available. Never render Devtools as `[Devtools](...)`, `[Spec Devtools](...)`, or any other Markdown link label; never hide the Devtools URL behind Markdown-only links, never print long GitHub URLs inline when a compact label can point to the same URL, and never invent links. If publishing cannot run, record `publish_status: blocked` and the concrete blocker in `state.json`.

## Final Output Shape

Always end with:

- `Mode`
- `Evidence`
- `Findings`
- `Governance`
- `Readiness`
- `Outcome`
- `HTML Companion`
- `Remote Docs`
- `Next`
