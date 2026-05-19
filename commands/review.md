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
When `/aw:review` writes or materially updates findings, governance, or readiness evidence, invoke `platform-core:human-collaboration-artifacts` with the `pr-one-pager` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Skill authorization: invoking `/aw:review` in `dual` or `html` output mode is an explicit user request to run `platform-core:human-collaboration-artifacts` for the human-facing HTML companion. When the harness can spawn subagents, this also authorizes exactly one background `aw:echo` subagent, scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Run `platform-core:human-collaboration-artifacts` and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. Record the companion as `queued` or `generating` while an optional Echo subagent runs. If the tool layer cannot spawn `aw:echo`, continue in-process with the HCA skill; do not create stage-local fallback HTML. Record `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and the Echo availability reason when HCA generates directly. If HCA itself cannot safely generate, record `status: blocked`, `publish_status: blocked`, and the exact blocker in `state.json`.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `run_ref` when available, publish status, any Echo availability reason, explicit Markdown-only skip, or blocked reason.

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

## HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, invoke `platform-core:human-collaboration-artifacts` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` companion job. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish config or publisher internals in this stage. Add HCA/Echo returned links to the final `Remote Docs` section. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

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
