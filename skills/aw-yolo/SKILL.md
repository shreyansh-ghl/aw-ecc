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
The communication should stay plain and concise for a zero-context reader: current stage, what actually happened, what evidence exists, and what action is being executed now.

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
4. Add the missing operational rails before continuing.
   For risky work, name the current abort conditions, retry limits, and approval assumptions before pushing into later stages.
   Typical auto-stop conditions include repeated build failure on new root causes, critical security findings with no safe fix, missing deploy mechanism, or release evidence that never reaches a trustworthy state.
5. Preserve stage artifacts.
   Internal orchestration is not permission to skip `execution.md`, `verification.md`, `release.md`, or `state.json`.
   A stage is not done until its required artifacts are written.
6. Respect stage boundaries.
   `aw-yolo` coordinates stages, but it does not collapse them together.
   Build still cannot self-certify.
   Test still cannot quietly implement.
   Deploy still cannot skip verify.
   Ship still owns rollout closeout rather than implementation or release execution.
7. Respect org standards at each stage.
   Use the resolved GHL baseline profile, platform playbooks, and `.aw_rules`.
8. Stop cleanly on blockers.
   Stop immediately if a stage fails, evidence is missing, deploy configuration is unknown, or approval assumptions become unsafe.
   Name the blocking stage and the smallest safe next action.
   Name:
   - the blocking stage
   - what was completed
   - the smallest safe next action
9. End with a real terminal state.
   The run is complete only when:
   - the final remaining stage is finished and its artifact exists, or
   - the workflow stops at a named blocker with a clear handoff
   If the next stage action is safe and obvious, execute it rather than stopping at advice.

## Final Output Shape

Always end with:

- `Current Stage`
- `Completed Stages`
- `Artifacts Written`
- `Blockers`
- `Recommended Next`

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "If the user said ship, I should always use yolo." | `ship` is now its own stage. `aw-yolo` is only for explicit whole-flow automation. |
| "One-run automation means I can skip stage evidence." | Orchestration still owes every required artifact. |
| "The request mentioned several stages, so I should always start from plan." | Start from the first unsatisfied stage, not from the beginning by habit. |
| "If test or review fails, I should push through to deploy anyway." | `aw-yolo` must stop at the failing stage and hand back the blocker clearly. |
| "Autonomous flow means I can improvise retries forever." | One-run automation still needs named retry limits and abort conditions. |

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
- [ ] risky stages named retry limits and abort conditions before pushing forward
- [ ] each stage still writes its required artifacts
- [ ] failed stages stop the flow instead of being hand-waved away
- [ ] blockers name the exact stage where the run stopped
