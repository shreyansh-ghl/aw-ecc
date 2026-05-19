---
name: aw:ship
description: Own launch, rollout safety, rollback readiness, and release closeout after the requested release action has been prepared or executed.
argument-hint: "<release context, rollout goal, monitoring links, or launch request>"
status: active
stage: ship
internal_skill: aw-ship
---

# Ship

Use `/aw:ship` for launch discipline, not as the old composite "do everything" shortcut.

## Role

Confirm the release is ready to launch, roll it out safely, document rollback readiness, and close out the release with the right operational evidence.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `launch-readiness` | a go/no-go launch decision is needed | `release.md`, `state.json` |
| `rollout` | staged or production rollout needs monitoring and checkpoints | `release.md`, `state.json` |
| `closeout` | the release action happened and needs operational closeout | `release.md`, `state.json` |

## Required Inputs

- reviewed work
- deploy outcome or explicit release target
- rollback plan or blocker
- monitoring or health-check context when available

## Outputs

- `.aw_docs/features/<feature_slug>/release.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- `.aw_docs/features/<feature_slug>/release.html` when docs output mode is `dual` or `html`
- launch recommendation, rollout checkpoints, rollback path, and closeout notes

## Human HTML Companion

Markdown `release.md` remains canonical for agents.
When `/aw:ship` writes or materially updates launch, rollout, rollback, or closeout evidence, invoke `platform-core:human-collaboration-artifacts` with the `release-report` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Skill authorization: invoking `/aw:ship` in `dual` or `html` output mode is an explicit user request to run `platform-core:human-collaboration-artifacts` for the human-facing HTML companion. When the harness can spawn subagents, this also authorizes exactly one background `aw:echo` subagent, scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Run `platform-core:human-collaboration-artifacts` and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. Record the companion as `queued` or `generating` while an optional Echo subagent runs. If the tool layer cannot spawn `aw:echo`, continue in-process with the HCA skill; do not create stage-local fallback HTML. Record `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and the Echo availability reason when HCA generates directly. If HCA itself cannot safely generate, record `status: blocked`, `publish_status: blocked`, and the exact blocker in `state.json`.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `run_ref` when available, publish status, any Echo availability reason, explicit Markdown-only skip, or blocked reason.

## Shipping Rules

1. Treat rollout safety as its own stage.
2. Run the internal `aw-prepare` gate when release context, workspace state, or artifact readiness is unclear before continuing with shipping work.
3. Continue until the selected shipping scope is covered or explicitly blocked.
4. Confirm rollback readiness before claiming launch readiness.
5. Capture post-deploy evidence, monitoring links, and known risks.
6. For frontend releases, include versioned entry, smoke, and accessibility or design-signoff notes when relevant.
7. Do not use `ship` as a synonym for composite orchestration.
8. Generate or explicitly record the HTML companion status before handoff.

## Internal Phase Routing

| Phase | Internal owner | Purpose |
|---|---|---|
| `prepare` | `aw-prepare` | verify release context, artifact readiness, and workspace safety before risky shipping work |
| `ship` | `aw-ship` | own launch readiness, rollout safety, rollback posture, and closeout evidence |

## Must Not Do

- must not quietly rerun the whole SDLC under the name `ship`
- must not claim launch safety without rollback or monitoring context
- must not bypass org-specific release gates

## Recommended Next Commands

- none required
- `/aw:review` if new launch blockers appear

## HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, invoke `platform-core:human-collaboration-artifacts` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` companion job. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish config or publisher internals in this stage. Add HCA/Echo returned links to the final `Remote Docs` section. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Mode`
- `Launch Readiness`
- `Rollout Plan`
- `Rollback Path`
- `Evidence`
- `Outcome`
- `HTML Companion`
- `Remote Docs`
- `Next`
