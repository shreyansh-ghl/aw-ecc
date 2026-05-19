---
name: aw:investigate
description: Reproduce, localize, and confirm bugs, alerts, and failing behavior before broad fixes are attempted.
argument-hint: "<bug, alert, failing behavior, log signal, or incident scope>"
status: active
stage: investigate
internal_skill: aw-investigate
---

# Investigate

Use `/aw:investigate` when the problem is real but the cause is not yet clear.

## Role

Turn vague breakage into a concrete reproduction, localized fault surface, and next-action recommendation.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `bug` | product behavior is wrong | `investigation.md`, `state.json`, repro and fault-surface notes |
| `alert` | monitoring or runtime alert fired | `investigation.md`, `state.json`, signal triage and likely cause |
| `regression` | a previously working flow broke | `investigation.md`, `state.json`, diff and regression notes |
| `incident` | failure may span services or environments | `investigation.md`, `state.json`, scoped blast-radius and next probes |

## Outputs

- `.aw_docs/features/<feature_slug>/investigation.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- `.aw_docs/features/<feature_slug>/investigation.html` when docs output mode is `dual` or `html`
- reproduction, expected-vs-actual, hypothesis, and next probe or build handoff

## Human HTML Companion

Markdown `investigation.md` remains canonical for agents.
When `/aw:investigate` writes or materially updates investigation evidence, invoke `platform-core:human-collaboration-artifacts` with the `investigation-report` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Skill authorization: invoking `/aw:investigate` in `dual` or `html` output mode is an explicit user request to run `platform-core:human-collaboration-artifacts` for the human-facing HTML companion. When the harness can spawn subagents, this also authorizes exactly one background `aw:echo` subagent, scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Run `platform-core:human-collaboration-artifacts` and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. Record the companion as `queued` or `generating` while an optional Echo subagent runs. If the tool layer cannot spawn `aw:echo`, continue in-process with the HCA skill; do not create stage-local fallback HTML. Record `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and the Echo availability reason when HCA generates directly. If HCA itself cannot safely generate, record `status: blocked`, `publish_status: blocked`, and the exact blocker in `state.json`.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `run_ref` when available, publish status, any Echo availability reason, explicit Markdown-only skip, or blocked reason.

## Investigation Rules

1. Reproduce first.
2. Capture expected vs actual behavior.
3. Load `diagnose` for unclear bugs, regressions, performance problems, repeated failed fixes, or any case where a reliable feedback loop is not already established.
4. Use the smallest confirming probe before patching.
5. Load org-standard observability and platform playbooks when the baseline requires them.
6. For frontend issues, include runtime and responsive evidence when relevant.
7. Name the exact next probe or next command before stopping.
8. Do not broaden into implementation until the fault surface is concrete enough.
9. Generate or explicitly record the HTML companion status before handoff.

## Must Not Do

- must not guess through an unclear root cause
- must not stack speculative fixes without new evidence
- must not claim a fix without handing off to `/aw:build` or proving it directly

## Recommended Next Commands

- `/aw:build`
- `/aw:test`

## HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, invoke `platform-core:human-collaboration-artifacts` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` companion job. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish config or publisher internals in this stage. Add HCA/Echo returned links to the final `Remote Docs` section. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Mode`
- `Reproduction`
- `Expected vs Actual`
- `Evidence`
- `Likely Fault Surface`
- `HTML Companion`
- `Remote Docs`
- `Next`
