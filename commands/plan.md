---
name: aw:plan
description: Define the minimum correct planning artifacts for the request without drifting into execution.
argument-hint: "<goal, request, or existing artifact>"
status: active
stage: plan
internal_skill: aw-plan
---

# Plan

Use `/aw:plan` to decide what needs to be planned and to produce only the planning artifacts required for the request.
This command owns planning only.
It should stay narrow by default and should not write implementation code.

## Role

Turn an idea, requirement, approved design, or technical request into the minimum correct planning artifacts for execution.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `product` | problem, scope, or acceptance criteria are unclear | `prd.md`, `state.json` |
| `design` | UX behavior or interface design must be defined | `design.md`, `designs/`, `state.json` |
| `technical` | implementation approach or architecture must be defined | `spec.md`, `state.json` |
| `tasks` | implementation work needs to be broken into steps | `tasks.md`, `state.json` |
| `full` | multiple planning artifacts are missing | missing artifacts in order, plus `state.json` |

## Required Inputs

- the user request
- repo context
- relevant platform docs
- relevant `.aw_rules`

## Optional Inputs

- existing `prd.md`
- existing `design.md`
- existing `designs/`
- existing `spec.md`
- existing `tasks.md`
- tickets, bug reports, screenshots, API contracts, or Figma links

## Outputs

- `.aw_docs/features/<feature_slug>/state.json`
- one or more of:
  - `prd.md`
  - `design.md`
  - `designs/`
  - `spec.md`
  - `tasks.md`

## Execution Rules

1. Classify the request into one primary mode first.
2. Operate in read-only planning mode until the artifacts are written.
3. Default to single-scope planning.
4. If the request is fuzzy, discovery-heavy, or too large for one spec, route internally through `aw-brainstorm` before technical planning.
5. Use existing artifacts as inputs when they are already sufficient.
6. Route approved technical direction through `aw-spec` before task planning.
7. Route approved specs through `aw-tasks` when execution-ready tasks are missing or stale.
8. Do not require a PRD for a technical request that is already well defined.
9. When writing technical or task artifacts, make them concrete enough for build to proceed without re-planning file scope, validation, and task order.
10. When writing `tasks.md`, always include an explicit `## Spec Brief` section and organize the work into explicit phases.

## Planning Depth

When `/aw:plan` writes `spec.md` or `tasks.md`, prefer:

- an explicit `## Spec Brief` section at the top of `tasks.md`
- exact file paths when they can be inferred safely
- likely file scope when exact paths are not yet safe
- dependency ordering and vertical slices instead of horizontal batches
- phased task breakdown with explicit phase headings
- concrete task goals
- 2-5 minute checkbox steps for non-trivial work
- exact commands with expected failure or pass signals
- commit boundaries for meaningful slices
- save-point commit expectation for meaningful slices
- explicit `parallel_group`, `parallel_ready_when`, and `parallel_write_scope` details when work can fan out safely
- `max_parallel_subagents: 3` by default for planned fan-out, unless another cap is explicitly justified
- validation commands or evidence targets
- checkpoints between major phases
- dependency or ordering notes
- bounded parallel candidates only when write scope is disjoint
- no placeholders and a self-review pass before handoff

## Hard Gates

- do not write implementation code
- do not run deploy steps
- do not force unrelated artifacts
- do not invent product or design work for a technical-only request

## Must Not Do

- must not jump directly into `/aw:build`
- must not create random artifact names
- must not silently broaden scope

## Recommended Next Commands

- `/aw:build`
- `/aw:review` if the user wants the planning artifacts reviewed before implementation

## Internal Routing

This command may still use internal helpers where useful, but the public contract remains `/aw:plan`.

- discovery-heavy ideation should use `aw-brainstorm`
- technical contract authoring should use `aw-spec`
- execution-recipe task writing should use `aw-tasks`
- the primary stage skill remains `aw-plan`

## Final Output Shape

Always end with:

- `Route`
- `Mode`
- `Created`
- `Spec Brief`
- `Phases`
- `Summary`
- `Execution Readiness`
- `Missing`
- `Next`
