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
When `/aw:deploy` writes or materially updates release evidence, delegate to the `aw:echo` subagent with the `release-report` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Subagent authorization: invoking `/aw:deploy` in `dual` or `html` output mode is an explicit user request to delegate the human-facing HTML companion to exactly one background `aw:echo` subagent. This authorization is scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, load `platform-core:human-collaboration-artifacts` and generate the colocated `.html` sidecar in the same turn as a controlled HCA fallback. Do not freehand or command-template HTML outside that skill contract. Record the companion as `generated_hca_fallback` with the exact Echo availability blocker, keep Markdown canonical, and include the fallback note in the final handoff.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `run_ref` when available, publish status, and any explicit Markdown-only skip, HCA fallback reason, or blocked reason.

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

## Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not run docs publish commands in this stage. Add Echo's returned links to the final `Remote Docs` section. If Echo cannot generate or publish, record `publish_status: blocked` and Echo's blocker in `state.json`; do not invent links.

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
