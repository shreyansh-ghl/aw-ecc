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
When `/aw:test` writes or materially updates QA evidence, HTML sidecars are required in `dual` and `html` output modes. Use `platform-core:echo-direct` directly to generate or refresh `.aw_docs/features/<feature_slug>/verification.html` with the `verification-report` profile.

Resolve docs output mode in this order: explicit user or session request, stage-local request, `.aw_docs/config.json` `docs.outputMode`, `AW_DOCS_OUTPUT_MODE`, then default `dual`.
- `dual` mode keeps Markdown canonical and requires the HTML companion.
- `html` mode requires the HTML companion and still preserves any canonical Markdown the stage must write.
- explicit Markdown-only mode skips HTML and records `status: skipped` with `skip_reason: explicit_markdown_only`.

Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`. In `dual` or `html` mode, the stage is not complete until the skill has generated the sidecar or recorded a concrete blocker. In explicit Markdown-only mode, do not generate HTML.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, `status: generated` when successful, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason. Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.

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

## Echo Direct Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for every required human companion in `dual` or `html` mode. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent. This same skill is also the repair path for existing folders with missing, stale, blocked, local-only, legacy uncontrolled fallback, unpublished, or linkless companions.

Do not duplicate docs publish commands or publish configuration in this stage. `platform-core:echo-direct` owns HTML generation, publish handoff, companion state updates, and returned TeamOfOne/GitHub links. Before the final response, inspect the skill result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute TeamOfOne URLs with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: [spec.html](<absolute repository URL>)` or another short artifact label when both URLs are available. Never hide the TeamOfOne URL behind Markdown-only links, never print long GitHub URLs inline when a compact label can point to the same URL, and never invent links. If publishing cannot run, record `publish_status: blocked` and the concrete blocker in `state.json`.

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
