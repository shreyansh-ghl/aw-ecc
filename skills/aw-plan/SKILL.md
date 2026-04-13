---
name: aw-plan
description: Create the minimum correct planning artifacts under `.aw_docs/features/<feature_slug>/` and stop cleanly before implementation.
trigger: User requests planning, a missing planning artifact blocks build, or `aw-yolo` needs to move work into a build-ready state.
---

# AW Plan

## Overview

`aw-plan` owns planning only.
It creates the minimum correct planning artifact set for the request and always writes deterministic outputs under:

- `.aw_docs/features/<feature_slug>/`

When planning is required, the output should be execution-ready for a fresh worker with limited repo context.
That means the plan should reduce guesswork around files, validation, order, and handoff risks instead of stopping at vague prose.
For non-trivial work, `aw-plan` should behave like a small internal planning graph rather than a single flat prompt.
Write the result for a reader with zero prior context: start with what is being built, then the spec brief, then the phased task plan, using short concrete language instead of dense planning jargon.

## When to Use

- the user needs a PRD, design, spec, or task breakdown
- approved work is missing a planning artifact needed by build
- a request is too large, too fuzzy, or too risky to execute directly
- `aw-yolo` needs to move work into a build-ready state

**When NOT to use:** when the request is already build-ready, when the issue is really investigation rather than planning, or when the user is only asking for test, review, deploy, or ship work.

## Workflow

This legacy heading maps to the detailed planning process below.

## The Planning Process

1. Enter plan mode.
   Load repo context, relevant platform docs, and relevant `.aw_rules`.
   Planning is read-only until the planning artifacts are written.
2. Identify the feature and current artifact state.
   Infer or honor the feature slug.
   Detect which planning artifacts already exist and which are actually missing.
3. Run targeted discovery before freezing the plan.
   Identify impacted repos, modules, interfaces, dependency chains, prior patterns, related ADRs, and likely blast radius.
   If local context is weak, the request is high risk, or multiple subsystems are involved, deepen the plan with focused architecture, security, performance, data, frontend, or infra review before choosing the final artifact set.
4. Choose the smallest internal route.
   Decide whether the request is already clear enough for direct planning or still needs discovery first.
   For raw concepts or product-shaping work, load `idea-refine` before freezing the direction.
5. Plan in dependency order.
   Use dependency graph thinking to decide whether product, design, technical, or tasks work must come first.
   For public interface or contract changes, load `api-and-interface-design`.
   For deprecation, replacement, or migration work, load `deprecation-and-migration`.
   For major architectural or public-behavior decisions, load `documentation-and-adrs`.
6. Add an explicit decomposition pass when needed.
   If the work spans multiple vertical slices, cross-repo changes, or task groups that would exceed one clean checkpoint, decompose before authoring the final `tasks.md`.
   Prefer end-to-end slices that could be reviewed, tested, and rolled back independently.
7. Slice vertically where possible.
   Prefer end-to-end feature slices and concrete checkpoints over horizontal batch plans.
8. Write only the missing artifacts.
   Make every created artifact concrete enough for the next stage to proceed without re-planning file scope, validation, and task order.
   When `tasks.md` is written, always organize implementation into explicit phases instead of one flat checklist.
9. Run a planning checkpoint before handoff.
   If open decisions still affect scope, architecture, rollout, or ownership, stop and surface them instead of pretending the plan is ready.
10. Review and update state.
   Run a placeholder, consistency, traceability, and decomposition pass, then update `.aw_docs/features/<feature_slug>/state.json`.
11. Stop after planning.
   Recommend the next stage without drifting into build, test, or deploy.

## Internal Skill Graph

Use the smallest correct internal route:

- unclear repo or module impact, missing local context, or ambiguous blast radius -> do a discovery pass before writing artifacts
- raw idea or under-shaped concept -> `idea-refine`, then `aw-brainstorm` when deeper repo-aware exploration is still needed
- fuzzy request, open design question, or overscoped feature -> `aw-brainstorm`
- high-risk, cross-cutting, or unfamiliar work -> deepen the plan with focused domain review before freezing technical choices
- approved direction but missing technical contract -> `aw-spec`
- approved direction that still spans too many implementation slices -> decompose it before finalizing `tasks.md`
- approved spec but missing execution recipe -> `aw-tasks`
- already execution-ready tasks -> stop and recommend `aw-build`

Do not collapse all of these responsibilities back into one vague planning pass.

## Planning Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `product` | problem, scope, or acceptance criteria are unclear | `prd.md`, `state.json` |
| `design` | UX behavior or interface design must be defined | `design.md`, `designs/`, `state.json` |
| `technical` | implementation approach or architecture must be defined | `spec.md`, `state.json` |
| `tasks` | implementation work needs to be broken into steps | `tasks.md`, `state.json` |
| `full` | multiple planning artifacts are missing | missing artifacts in order, plus `state.json` |

## Artifact Rules

- write artifacts only under `.aw_docs/features/<feature_slug>/`
- use only deterministic names:
  - `prd.md`
  - `design.md`
  - `designs/`
  - `spec.md`
  - `tasks.md`
  - `state.json`
- do not write planning artifacts to `docs/plans/`
- do not create random filenames
- do not write implementation code

## Plan Document Template

### `prd.md`

Capture:

- goal
- scope
- non-goals
- acceptance criteria
- risks or dependencies

### `design.md`

Capture:

- routes or flows
- states
- interaction rules
- accessibility notes
- references to `designs/`

### `spec.md`

Canonical internal owner: `aw-spec`

Capture:

- implementation goal
- scope
- interfaces or contracts
- technical approach
- failure modes
- acceptance criteria
- verification targets
- expected changed files or modules when those can be inferred safely
- key commands, migrations, or rollout constraints that execution must honor

### `tasks.md`

Canonical internal owner: `aw-tasks`

Start with a short header that captures:

- feature goal
- spec brief in plain language
- architecture summary
- execution route: `/aw:build`
- expected execution mode when it is known safely

Before task sections, map the file structure:

- exact files to create
- exact files to modify
- exact tests to add or update
- the responsibility of each file when that can be stated clearly

Break implementation into small, executable chunks with:

- named phases such as `Phase 1`, `Phase 2`, or a short milestone label
- files
- checkbox steps
- acceptance
- task type: `code`, `infra`, `docs`, `migration`, or `config`
- validation command or evidence target
- save-point commit expected for the slice
- dependency or ordering note when sequencing matters
- `parallel_candidate` only when the write scope is safely disjoint
- `parallel_group` when multiple slices can fan out after the same prerequisite
- `parallel_ready_when` when parallel work must wait for a contract, helper, or schema to land first
- `parallel_write_scope` so execution can keep ownership boundaries explicit
- `max_parallel_subagents: 3` by default when parallel fan-out is planned, unless another cap is explicitly justified

For code behavior, prefer task steps close to:

- write the failing test or capture the failing signal
- run it to verify the failure is real
- write the minimal change
- rerun the relevant verification to confirm the pass
- commit the focused slice

Each step should usually be small enough to fit in about 2-5 minutes.
Use `../../references/task-sizing-and-checkpoints.md` when sizing or checkpointing gets fuzzy.

## Spec Brief

At the top of `tasks.md`, include a short `Spec Brief` section that explains:

- what is being built or changed
- why it matters
- the core technical shape
- the main risks or constraints

Write this like the reader has zero context.
It should be concise, concrete, and understandable without reading the full spec first.

## Phase 1

Use explicit phase headings in `tasks.md` such as `## Phase 1`, `## Phase 2`, or a short milestone title.
For each phase, add:

- phase a short outcome statement
- the exact file paths touched in that phase
- 2-5 minute checkbox steps
- exact commands and expected outcomes
- the validation command or evidence target
- the save-point commit expected for the slice or phase

## Execution-Ready Tasks

`tasks.md` is not complete until a fresh worker can execute it without rediscovering the plan.

Execution-ready tasks should make it obvious:

- which files change first
- which validation command or evidence target proves each slice
- which steps are safe to parallelize
- which `parallel_group` and `parallel_write_scope` belong to those steps
- what `max_parallel_subagents` cap build should honor for that plan
- which slice should produce the next save-point commit
- which blocker should send execution back to planning instead of guessing

## Plan Richness

When the request is in `technical`, `tasks`, or `full` mode, planning should be specific enough that execution does not have to rediscover the shape of the work.

Prefer including:

- codebase impact: affected repos, modules, integration points, and dependency chains
- known patterns, ADRs, or prior learnings that should constrain the implementation
- exact or likely changed files and what each one is responsible for
- exact file paths when they can be inferred safely
- concrete task goals
- checkbox execution steps for non-trivial work
- exact commands and expected outcomes for failure and pass checks
- the minimal validation commands or evidence expected after implementation
- commit boundaries for meaningful slices
- save-point commit expectations for meaningful slices
- sequencing notes for dependent tasks
- bounded parallel candidates for disjoint work
- explicit `parallel_group`, `parallel_ready_when`, and `parallel_write_scope` notes when work may fan out
- a `max_parallel_subagents` cap that defaults to `3` unless a different cap is explicitly justified
- alternative approaches considered when the technical path is risky, unfamiliar, or irreversible
- key risks, blockers, or rollback constraints

If a proposed slice cannot support a clean save-point commit, planning should merge it into the next dependent slice instead of normalizing a no-commit checkpoint.

The goal is not maximum verbosity.
The goal is minimum ambiguity.

Use `../../references/task-sizing-and-checkpoints.md` when task sizing, checkpoint placement, or phase boundaries start getting fuzzy.

## Task Sizing Guidelines

`tasks.md` should avoid vague tasks such as:

- "implement feature"
- "fix bug"
- "update code as needed"

Prefer task units that name:

- goal
- file scope
- change intent
- acceptance check
- validation command or evidence target
- expected verification signal
- commit boundary when the slice is meaningful

## No Placeholders

Planning fails if it contains placeholders such as:

- `TODO`
- `TBD`
- `implement later`
- `write tests`
- `handle edge cases`
- `same as Task N`

If execution would need to guess what a step means, planning is not complete.

Use these guardrails when sizing work:

| Size | Scope signal | Default action |
|---|---|---|
| `XS` | single-file or single-boundary clarification | keep it as one focused task |
| `S` | one slice with one primary validation target | ideal task size |
| `M` | 3-5 files or one vertical feature slice | acceptable when checkpoints are explicit |
| `L` | multiple subsystems or mixed rollout risk | break it down further |
| `XL` | broad subsystem batch or multi-phase rollout | planning failure until decomposed |

If a task title needs "and", it is usually more than one task.
If a step would take longer than one focused implementation session, break it down further.

## Parallelization Opportunities

Parallel work is allowed only when the write scope is clearly disjoint.
Plan parallel work in bounded waves rather than unbounded fan-out.

- safe to parallelize:
  - docs versus code
  - backend versus frontend after the contract is fixed
  - implementation versus reference/checklist preparation
- do not parallelize:
  - tasks that change the same files
  - rollout-sensitive migrations
  - tasks that depend on a helper, interface, or schema not created yet

Default to `max_parallel_subagents: 3` when parallel build fan-out is useful.
Only change that cap when the plan names a concrete reason such as runtime limits, repo size, or a proven need for tighter sequencing.

When in doubt, sequence the work and leave `parallel_candidate` off.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I’ll figure it out while building." | That is how scope drift and rework start. |
| "The tasks are obvious, so I don’t need to write them down." | Written plans expose hidden dependencies and missing checks. |
| "A big batch plan is faster." | Thin vertical slices are easier to verify, review, and roll back. |
| "Planning should stay abstract." | Abstract plans force the next stage to re-plan the work. |

## Red Flags

- planning begins with implementation advice instead of artifact selection
- task steps are vague enough that build would need to rediscover the file scope
- no checkpoints exist between meaningful phases
- multiple independent subsystems are bundled into one undifferentiated task list
- placeholders like `TODO`, `TBD`, or "handle edge cases" remain in the artifacts

## Verification

The verification pass for planning is the plan self-review.

## Plan Self-Review

Before ending the planning stage:

1. confirm discovery covered the impacted repos, modules, interfaces, and dependency chains well enough for the chosen scope
2. confirm high-risk or cross-cutting decisions received the needed deepen-style review instead of being hand-waved
3. confirm each spec requirement maps to a task or explicit reason it is out of scope
4. confirm tasks are grouped into explicit phases instead of one flat list
5. scan for placeholders and vague steps
6. check that file paths, type names, helper names, and commands stay consistent
7. confirm the next stage can route directly to `/aw:build` or explicitly state what approval is still missing

Treat this as the planning verification pass.
If the plan cannot survive this self-review, it is not ready for execution handoff.

## Execution Handoff

When `tasks.md` is ready:

- recommend `/aw:build`
- name the selected execution mode when it is known safely
- name any blocker that should send the work back to planning instead of guessing

## Hard Gates

- do not write code
- do not require `prd.md` for a technical-only request that is already well-defined
- do not force unrelated artifacts
- do not silently broaden a narrow planning request into full planning
- do not produce handoff tasks so vague that execution must re-plan the file scope

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "plan"`
- `mode`
- `status`
- written artifacts
- key inputs
- internal skills used
- discovery notes and prior-pattern inputs
- planned save-point commit policy
- parallel build policy and cap when parallel execution is planned
- recommended next commands

## Final Output Shape

Always end with:

- `Route`
- `Mode`
- `Created`
- `Spec Brief`
- `Phase Plan`
- `Execution Readiness`
- `Missing`
- `Next`
