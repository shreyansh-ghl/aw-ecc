---
name: aw:deploy
description: Create one requested release outcome for work that already has the required QA, review, and readiness evidence.
argument-hint: "<reviewed work, target environment, or release request>"
status: active
stage: deploy
internal_skill: aw-deploy
---

# Deploy

Use `/aw:deploy` to turn reviewed work into a PR, branch handoff, or deployment outcome.

## Role

Perform one explicit release action with the correct GHL provider and mechanism for the current repo archetype.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `pr` | work should be handed off for review or merge | PR URL, `release.md`, `state.json` |
| `branch` | work should remain on a branch | branch name, `release.md`, `state.json` |
| `staging` | reviewed work should go to staging | deploy evidence, `release.md`, `state.json` |
| `production` | explicitly approved work should go to production | deploy evidence, `release.md`, `state.json` |

## Required Inputs

- passing test and review outcome, or a compatible verified state that resolves to the same evidence
- branch or change set
- relevant release context
- resolved deploy profile when present

## Outputs

- `.aw_docs/features/<feature_slug>/release.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- `.aw_docs/features/<feature_slug>/release.html` when docs output mode is `dual` or `html`
- one concrete release outcome artifact:
  - PR URL
  - branch name
  - staging URL
  - deployment reference
  - build links
  - status summary

## Human HTML Companion

Markdown `release.md` remains canonical for agents.
When `/aw:deploy` writes or materially updates release evidence, run `platform-core:echo-direct` with the `release-report` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Echo Direct is the default SDLC HTML path. Do not spawn `aw:echo` for this stage unless the user explicitly asks for a background/agent comparison; run `platform-core:echo-direct` in-process instead.
HTML sidecars are required before the final handoff. Load `platform-core:echo-direct`, let it invoke `platform-core:human-collaboration-artifacts`, and wait for the colocated `.html` sidecar. Do not freehand or command-template HTML outside that skill contract. Record successful Echo Direct execution as `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, `runner: platform-core:echo-direct`, and `echo_agent_status: in_process_fast_path`; do not record successful Echo Direct output as `generated_fallback` or `generated_hca_fallback`. Keep Markdown canonical and include Echo Direct/HCA provenance in the final handoff.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `runner`, `echo_agent_status`, publish status, remote links, and any explicit Markdown-only skip, Echo Direct/HCA provenance, or blocked reason.

## Deploy Rules

1. Do one release action at a time.
2. Resolve the provider and mechanism from repo archetype and baseline profile.
3. Finish the selected release action for the chosen mode or record the blocker explicitly.
4. Record deterministic evidence even when external execution is blocked.
5. Hand off to `/aw:ship` when launch, rollout, rollback readiness, or release closeout is requested after deploy.
6. Generate or explicitly record the HTML companion status before handoff.

## Must Not Do

- must not bypass test and review evidence
- must not silently choose the wrong provider
- must not reopen planning during deployment

## Recommended Next Commands

- `/aw:ship`

## Echo Direct/HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish commands or publish configuration in this stage. The Echo Direct/HCA handoff owns HTML generation and remote sharing. Before the final response, inspect the Echo Direct/HCA handoff result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute TeamOfOne URLs with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: [spec.html](<absolute repository URL>)` (or another short artifact label) when Echo Direct/HCA returns or records both; never collapse them to bare `TeamOfOne` and `GitHub` labels, hide the TeamOfOne URL behind Markdown-only links, or print long GitHub URLs inline when a compact label can point to the same URL. If Echo Direct/HCA cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Selected Mode`
- `Provider`
- `Resolved Mechanism`
- `Build Links`
- `Execution Evidence`
- `Rollback Path`
- `Outcome`
- `HTML Companion`
- `Remote Docs`
- `Next`
