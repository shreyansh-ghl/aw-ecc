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
When `/aw:review` writes or materially updates findings, governance, or readiness evidence, run `platform-core:echo-direct` with the `pr-one-pager` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Echo Direct is the default SDLC HTML path. Do not spawn `aw:echo` for this stage unless the user explicitly asks for a background/agent comparison; run `platform-core:echo-direct` in-process instead.
HTML sidecars are required before the final handoff. Load `platform-core:echo-direct`, let it invoke `platform-core:human-collaboration-artifacts`, and wait for the colocated `.html` sidecar. Do not freehand or command-template HTML outside that skill contract. Record successful Echo Direct execution as `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, `runner: platform-core:echo-direct`, and `echo_agent_status: in_process_fast_path`; do not record successful Echo Direct output as `generated_fallback` or `generated_hca_fallback`. Keep Markdown canonical and include Echo Direct/HCA provenance in the final handoff.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `runner`, `echo_agent_status`, publish status, remote links, and any explicit Markdown-only skip, Echo Direct/HCA provenance, or blocked reason.

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

## Echo Direct/HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish commands or publish configuration in this stage. The Echo Direct/HCA handoff owns HTML generation and remote sharing. Before the final response, inspect the Echo Direct/HCA handoff result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute TeamOfOne URLs with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: [spec.html](<absolute repository URL>)` (or another short artifact label) when Echo Direct/HCA returns or records both; never collapse them to bare `TeamOfOne` and `GitHub` labels, hide the TeamOfOne URL behind Markdown-only links, or print long GitHub URLs inline when a compact label can point to the same URL. If Echo Direct/HCA cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

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
