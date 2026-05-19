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
When `/aw:deploy` writes or materially updates release evidence, invoke `platform-core:human-collaboration-artifacts` with the `release-report` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Skill authorization: invoking `/aw:deploy` in `dual` or `html` output mode is an explicit user request to run `platform-core:human-collaboration-artifacts` for the human-facing HTML companion. When the harness can spawn subagents, this also authorizes exactly one background `aw:echo` subagent, scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Run `platform-core:human-collaboration-artifacts` and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. Record the companion as `queued` or `generating` while an optional Echo subagent runs. If the tool layer cannot spawn `aw:echo`, continue in-process with the HCA skill; do not create stage-local fallback HTML. Record `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and the Echo availability reason when HCA generates directly. If HCA itself cannot safely generate, record `status: blocked`, `publish_status: blocked`, and the exact blocker in `state.json`.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `run_ref` when available, publish status, any Echo availability reason, explicit Markdown-only skip, or blocked reason.

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

## HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, invoke `platform-core:human-collaboration-artifacts` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` companion job. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish config or publisher internals in this stage. Add HCA/Echo returned links to the final `Remote Docs` section. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

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
