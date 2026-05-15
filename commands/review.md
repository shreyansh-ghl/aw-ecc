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
When `/aw:review` writes or materially updates findings, governance, or readiness evidence, delegate to the `aw:echo` subagent with the `pr-one-pager` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Subagent authorization: invoking `/aw:review` in `dual` or `html` output mode is an explicit user request to delegate the human-facing HTML companion to exactly one background `aw:echo` subagent. This authorization is scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, create a conservative self-contained fallback HTML sidecar in the same turn, record `generated_fallback` with the blocker, and keep Markdown canonical.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `run_ref` when available, publish status, and any explicit Markdown-only skip or fallback reason.

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

## Remote AW Docs Publish

After the Markdown artifact, required HTML sidecar, and `state.json` companion entries are current, run `aw push --aw-docs-only` unless the user explicitly requested local-only or Markdown-only docs. Use the printed URLs, or `.aw_docs/last-publish.json`, as the source of truth for share links.

Add those links to the final `Remote Docs` section. If publishing fails, record `publish_status: blocked` and the blocker in `state.json`; do not invent links.

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
