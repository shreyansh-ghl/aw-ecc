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
When `/aw:ship` writes or materially updates launch, rollout, rollback, or closeout evidence, delegate to the `aw:echo` subagent with the `release-report` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Subagent authorization: invoking `/aw:ship` in `dual` or `html` output mode is an explicit user request to delegate the human-facing HTML companion to exactly one background `aw:echo` subagent. This authorization is scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, or if the user asks for skill-only/direct Echo, load `platform-core:echo-direct` when available and otherwise load `platform-core:human-collaboration-artifacts`; run direct HCA execution in the same turn. Do not freehand or command-template HTML outside that skill contract. Record successful direct HCA execution as `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, optional `runner: platform-core:echo-direct`, and `echo_agent_status: unavailable` with the exact Echo availability reason; when `platform-core:echo-direct` runs as the same-turn fast path, record `echo_agent_status: in_process_fast_path`; do not record successful HCA output as `generated_fallback` or `generated_hca_fallback`. Keep Markdown canonical and include HCA/Echo provenance in the final handoff.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `run_ref` when available, publish status, remote links, and any explicit Markdown-only skip, HCA/Echo provenance, or blocked reason.

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

## HCA/Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only, Markdown-only, or skill-only/direct Echo docs. For skill-only/direct Echo runs, use `platform-core:echo-direct` when available and otherwise run direct HCA in the same turn. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish commands or publish configuration in this stage. The HCA/Echo handoff owns HTML generation and remote sharing. Before the final response, inspect the HCA/Echo handoff result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute TeamOfOne URLs with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: [spec.html](<absolute repository URL>)` (or another short artifact label) when HCA/Echo returns or records both; never collapse them to bare `TeamOfOne` and `GitHub` labels, hide the TeamOfOne URL behind Markdown-only links, or print long GitHub URLs inline when a compact label can point to the same URL. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

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
