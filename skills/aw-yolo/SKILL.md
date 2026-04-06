---
name: aw-yolo
description: Explicit internal orchestration skill for one-run end-to-end automation across plan, build, test, review, deploy, and ship.
trigger: Internal only. Use when the user clearly asks for one-run end-to-end automation instead of stage-by-stage progress.
---

# AW YOLO

## Overview

`aw-yolo` is the explicit full-flow orchestration skill.
It exists so `ship` can stay a real shipping stage instead of an overloaded composite label.

## When to Use

- the user explicitly asks to handle the full flow in one run
- the request spans multiple AW stages and the user wants automation, not manual stage boundaries

Do not use by default.
If the user asked for one stage, stay in that stage.

## Workflow

1. Classify the current state.
   Identify which stages are already satisfied.
2. Select the smallest correct remaining flow.
   Typical sequence:
   - `aw-plan`
   - `aw-build`
   - `aw-test`
   - `aw-review`
   - `aw-deploy`
   - `aw-ship`
3. Preserve stage artifacts.
   Internal orchestration is not permission to skip `execution.md`, `verification.md`, `release.md`, or `state.json`.
4. Respect org standards at each stage.
   Use the resolved GHL baseline profile, platform playbooks, and `.aw_rules`.
5. Stop cleanly on blockers.
   Name the blocking stage and the smallest safe next action.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "If the user said ship, I should always use yolo." | `ship` is now its own stage. `aw-yolo` is only for explicit whole-flow automation. |
| "One-run automation means I can skip stage evidence." | Orchestration still owes every required artifact. |

## Red Flags

- the request only named one stage but yolo was selected anyway
- stage artifacts are skipped because the flow is internal
- rollout safety is collapsed into deploy

## Verification

- [ ] the user explicitly wanted full-flow automation
- [ ] the selected flow is the smallest correct end-to-end sequence
- [ ] each stage still writes its required artifacts
- [ ] blockers name the exact stage where the run stopped
