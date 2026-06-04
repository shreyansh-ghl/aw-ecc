---
name: aw-yolo
description: Explicit internal orchestration skill for one-run end-to-end automation across plan, build, test, review, deploy, and ship.
trigger: Internal only. Use when the user clearly asks for one-run end-to-end automation instead of stage-by-stage progress.
---

# AW YOLO

## Overview

`aw-yolo` is the explicit full-flow orchestration skill.
It exists so `ship` can stay a real shipping stage instead of an overloaded composite label.
Use it to orchestrate the smallest correct remaining multi-stage path from the current state to a safe release outcome.

## When to Use

- the user explicitly asks to handle the full flow in one run
- the request spans multiple AW stages and the user wants automation, not manual stage boundaries
- the starting point is already partway through the lifecycle, but the user still wants the rest handled end to end

Do not use by default.
If the user asked for one stage, stay in that stage.

## Workflow

1. Confirm the request really wants orchestration.
   `aw-yolo` is only correct when the user wants the remaining workflow handled in one pass.
   If they only asked to deploy, ship, review, or test, stay in that stage.
2. Classify the current starting state.
   Identify which stage artifacts already exist and which stages are still unsatisfied.
   Use this table as the default operating model:

   | Starting state | Smallest correct remaining flow |
   |---|---|
   | only an idea, PRD, or vague approved direction | `aw-plan -> aw-build -> aw-test -> aw-review -> aw-deploy -> aw-ship` |
   | approved spec/tasks or otherwise build-ready inputs | `aw-build -> aw-test -> aw-review -> aw-deploy -> aw-ship` |
   | implementation exists but fresh evidence is missing | `aw-test -> aw-review -> aw-deploy -> aw-ship` |
   | verification is complete and the user wants release action plus closeout | `aw-deploy -> aw-ship` |
   | deploy action is complete and only rollout closeout remains | `aw-ship` |

   Do not reopen already satisfied stages unless the current stage fails and forces a backward step.
3. Execute one stage at a time.
   Run the first unsatisfied stage, write its required artifacts, then reassess the next smallest safe stage.
   Typical full sequence:
   - `aw-plan`
   - `aw-build`
   - `aw-test`
   - `aw-review`
   - `aw-deploy`
   - `aw-ship`
   Do not leave a stage early just because one slice, one check, or one note succeeded.
   A stage only hands off when its own completion contract is met or it is blocked explicitly.
4. Preserve stage artifacts.
   Internal orchestration is not permission to skip `execution.md`, `verification.md`, `release.md`, or `state.json`.
   A stage is not done until its required artifacts are written.
   HTML sidecars are required whenever the delegated stage writes a canonical Markdown artifact.
   When a delegated stage writes a canonical Markdown artifact, preserve that stage's Echo Direct obligation too: in `dual` and `html` modes, run `platform-core:echo-direct` directly to produce the colocated `.aw_docs/features/<feature_slug>/<artifact_basename>.html` companion before the stage handoff. Do not use a subagent for HTML generation, and do not hand-roll HTML outside the skill contract. Record successful output as `status: generated`, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, and remote links when available. Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair. In explicit Markdown-only mode, skip HTML and record the skip.
5. Respect stage boundaries.
   `aw-yolo` coordinates stages, but it does not collapse them together.
   Build still cannot self-certify.
   Test still cannot quietly implement.
   Deploy still cannot skip verify.
   Ship still owns rollout closeout rather than implementation or release execution.
6. Respect org standards at each stage.
   Use the resolved GHL baseline profile, platform playbooks, and `.aw_rules`.
7. Stop cleanly on blockers.
   Stop immediately if a stage fails, evidence is missing, deploy configuration is unknown, or approval assumptions become unsafe.
   Name the blocking stage and the smallest safe next action.
   Name:
   - the blocking stage
   - what was completed
   - the smallest safe next action
8. End with a real terminal state.
   The run is complete only when:
   - the final remaining stage is finished and its artifact exists, or
   - the workflow stops at a named blocker with a clear handoff

## Echo Direct Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for every required human companion in `dual` or `html` mode. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent. This same skill is also the repair path for existing folders with missing, stale, blocked, local-only, legacy uncontrolled fallback, unpublished, or linkless companions.

Do not duplicate docs publish commands or publish configuration in this stage. `platform-core:echo-direct` owns HTML generation, publish handoff, companion state updates, and returned Devtools/GitHub links. Before the final response, inspect the skill result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as plain-text absolute Devtools URLs rooted at `https://devtools.servers.stg.msgsndr.net/` (no Markdown link syntax around the Devtools URL) with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `Devtools: <absolute remote URL>` as raw visible text and `GitHub: [spec.html](<absolute repository URL>)` or another short artifact label when both URLs are available. Never render Devtools as `[Devtools](...)`, `[Spec Devtools](...)`, or any other Markdown link label; never hide the Devtools URL behind Markdown-only links, never print long GitHub URLs inline when a compact label can point to the same URL, and never invent links. If publishing cannot run, record `publish_status: blocked` and the concrete blocker in `state.json`.

## Final Output Shape

Always end with:

- `Current Stage`
- `Completed Stages`
- `Artifacts Written`
- `HTML Companions`
- `Remote Docs`
- `Blockers`
- `Recommended Next`

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "If the user said ship, I should always use yolo." | `ship` is now its own stage. `aw-yolo` is only for explicit whole-flow automation. |
| "One-run automation means I can skip stage evidence." | Orchestration still owes every required artifact. |
| "The request mentioned several stages, so I should always start from plan." | Start from the first unsatisfied stage, not from the beginning by habit. |
| "If test or review fails, I should push through to deploy anyway." | `aw-yolo` must stop at the failing stage and hand back the blocker clearly. |

## Red Flags

- the request only named one stage but yolo was selected anyway
- stage artifacts are skipped because the flow is internal
- rollout safety is collapsed into deploy
- already satisfied stages are reopened without a concrete reason
- the run reaches deploy or ship even though test or review evidence failed
- the final output does not say which stage the workflow ended on

## Verification

- [ ] the user explicitly wanted full-flow automation
- [ ] the selected flow is the smallest correct end-to-end sequence
- [ ] the chosen starting stage matches the current repo/artifact state
- [ ] each stage still writes its required artifacts
- [ ] each eligible stage generated or recorded its HTML companion status
- [ ] failed stages stop the flow instead of being hand-waved away
- [ ] blockers name the exact stage where the run stopped
