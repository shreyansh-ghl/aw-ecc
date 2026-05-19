---
name: aw:test
description: Produce fresh QA evidence for a feature, bugfix, or release scope using the resolved repo and org quality gates.
argument-hint: "<feature, fix, branch, diff, artifact, or release scope>"
status: active
stage: test
internal_skill: aw-test
---

# Test

Use `/aw:test` to prove the requested scope works with current evidence.

## Role

Run the smallest correct QA scope for the requested feature, fix, or release and write the evidence down clearly enough for review and deploy to trust it.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `feature` | validating a scoped implementation | `verification.md`, `state.json` |
| `bugfix` | proving a repaired behavior and regression guard | `verification.md`, `state.json` |
| `release` | validating the broader release-ready scope | `verification.md`, `state.json` |
| `ui-runtime` | frontend runtime, responsive, and interaction proof | `verification.md`, `state.json` |

## Outputs

- `.aw_docs/features/<feature_slug>/verification.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- `.aw_docs/features/<feature_slug>/verification.html` when docs output mode is `dual` or `html`
- fresh evidence for local validation, E2E, external validation, or targeted runtime checks

## Human HTML Companion

Markdown `verification.md` remains canonical for agents.
When `/aw:test` writes or materially updates QA evidence, delegate to the `aw:echo` subagent with the `verification-report` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Subagent authorization: invoking `/aw:test` in `dual` or `html` output mode is an explicit user request to delegate the human-facing HTML companion to exactly one background `aw:echo` subagent. This authorization is scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, load `platform-core:human-collaboration-artifacts` and run direct HCA execution in the same turn. Do not freehand or command-template HTML outside that skill contract. Record successful direct HCA execution as `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and `echo_agent_status: unavailable` with the exact Echo availability reason; do not record successful HCA output as `generated_fallback` or `generated_hca_fallback`. Keep Markdown canonical and include HCA/Echo provenance in the final handoff.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `run_ref` when available, publish status, remote links, and any explicit Markdown-only skip, HCA/Echo provenance, or blocked reason.

## QA Rules

1. Select the smallest correct test scope, not the loudest available suite.
2. Inherit the resolved GHL baseline profile for local validation, E2E, sandbox, and quality-gate expectations.
3. For bugfixes, prove the failing signal and the regression guard.
4. For frontend work, include responsive, accessibility-aware, and runtime evidence when relevant.
5. Continue until the requested QA scope is covered or explicitly blocked.
6. Mark unavailable checks as unavailable instead of inventing a pass.
7. Hand off to `/aw:review` when findings, governance, or readiness still need a decision.
8. Generate or explicitly record the HTML companion status before handoff.

## Must Not Do

- must not silently reuse stale evidence after code changed
- must not implement code while testing
- must not collapse feature QA and release readiness into one vague summary

## Recommended Next Commands

- `/aw:review`
- `/aw:build` if a failure requires repair

## HCA/Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish commands or publish configuration in this stage. The HCA/Echo handoff owns HTML generation and remote sharing. Before the final response, inspect the HCA/Echo handoff result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute URLs, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: <absolute repository URL>` when HCA/Echo returns or records both; never collapse them to bare `TeamOfOne` and `GitHub` labels, Markdown-only hidden links, or any other shorthand without visible URL strings. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Mode`
- `Scope`
- `Checks Run`
- `Evidence`
- `Failures`
- `Unavailable`
- `HTML Companion`
- `Remote Docs`
- `Next`
