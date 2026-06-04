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
When `/aw:ship` writes or materially updates launch, rollout, rollback, or closeout evidence, HTML sidecars are required in `dual` and `html` output modes. Use `platform-core:echo-direct` directly to generate or refresh `.aw_docs/features/<feature_slug>/release.html` with the `release-report` profile.

Resolve docs output mode in this order: explicit user or session request, stage-local request, `.aw_docs/config.json` `docs.outputMode`, `AW_DOCS_OUTPUT_MODE`, then default `dual`.
- `dual` mode keeps Markdown canonical and requires the HTML companion.
- `html` mode requires the HTML companion and still preserves any canonical Markdown the stage must write.
- explicit Markdown-only mode skips HTML and records `status: skipped` with `skip_reason: explicit_markdown_only`.

Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`. In `dual` or `html` mode, the stage is not complete until the skill has generated the sidecar or recorded a concrete blocker. In explicit Markdown-only mode, do not generate HTML.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, `status: generated` when successful, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason. Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.

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

## Echo Direct Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for every required human companion in `dual` or `html` mode. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent. This same skill is also the repair path for existing folders with missing, stale, blocked, local-only, legacy uncontrolled fallback, unpublished, or linkless companions.

Do not duplicate docs publish commands or publish configuration in this stage. `platform-core:echo-direct` owns HTML generation, publish handoff, companion state updates, and returned Devtools/GitHub links. Before the final response, inspect the skill result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as plain-text absolute Devtools URLs rooted at `https://devtools.servers.stg.msgsndr.net/` (no Markdown link syntax around the Devtools URL) with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `Devtools: <absolute remote URL>` as raw visible text and `GitHub: [spec.html](<absolute repository URL>)` or another short artifact label when both URLs are available. Never render Devtools as `[Devtools](...)`, `[Spec Devtools](...)`, or any other Markdown link label; never hide the Devtools URL behind Markdown-only links, never print long GitHub URLs inline when a compact label can point to the same URL, and never invent links. If publishing cannot run, record `publish_status: blocked` and the concrete blocker in `state.json`.

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
