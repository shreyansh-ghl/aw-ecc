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
3. Understand the problem before planning it.
   In `product` mode, start by having a conversation with the user. Think of it like a PM sitting down with a stakeholder — ask about scope, target users, success criteria, edge cases, and constraints. Listen to the answers. Follow up on anything vague. Keep going until the problem is genuinely clear. Only then move to writing artifacts.
   In other modes, decide whether the request is already clear enough for direct planning or needs discovery first.
   For raw concepts or product-shaping work, load `idea-refine` before freezing the direction.
   Always route planning intake through `grill-with-docs` as the Decision Confidence Gate before writing artifacts.
   Use adaptive depth: `clear` means state assumptions and proceed, `confirm` means ask one confirmation question, and `grill` means run the full one-question-at-a-time interview.
4. Plan in dependency order.
   Perform an explicit architecture review before freezing the technical path.
   Name the key assumptions, constraints, risks, and mitigations instead of leaving them implied.
   Use dependency graph thinking to decide whether product, design, technical, or tasks work must come first.
   For public interface or contract changes, load `api-and-interface-design`.
   For deprecation, replacement, or migration work, load `deprecation-and-migration`.
   For major architectural or public-behavior decisions, load `documentation-and-adrs`.
5. Slice vertically where possible.
   Prefer end-to-end feature slices and concrete checkpoints over horizontal batch plans.
   When a task plan needs a slice model before `tasks.md`, load `to-issues` and feed its vertical slices into `aw-tasks`; do not publish remote tracker issues unless the user explicitly requests that.
6. Write only the missing artifacts.
   When technical uncertainty exists, route through `aw-spec` before `aw-tasks`.
   Do not let task planning invent or silently repair an unresolved contract.
   Make every created artifact concrete enough for the next stage to proceed without re-planning file scope, validation, and task order.
7. Review and update state.
   Run the full planning self-review: spec coverage, placeholder scan, naming and type consistency, assumptions and constraints, and execution handoff quality.
   Then update `.aw_docs/features/<feature_slug>/state.json`.
8. Stop after planning.
   Recommend the next stage without drifting into build, test, or deploy.

## Internal Skill Graph

Use the smallest correct internal route:

- raw idea or under-shaped concept -> `idea-refine`, then `aw-brainstorm` when deeper repo-aware exploration is still needed
- fuzzy request, open design question, or overscoped feature -> `aw-brainstorm`
- domain-language-heavy or edge-case-heavy planning -> `grill-with-docs`
- product/full mode or missing product assumptions -> `to-prd`
- approved direction but missing technical contract -> `aw-spec`
- PRD/spec needs implementation-ready vertical slices -> `to-issues`, then `aw-tasks`
- approved spec but missing execution recipe -> `aw-tasks`
- already execution-ready tasks -> stop and recommend `aw-build`

Do not collapse all of these responsibilities back into one vague planning pass.

## Decision Confidence Gate

Before writing planning artifacts, load `grill-with-docs` and use its returned depth to decide the next move.

- If `grill-with-docs` returns `clear`, state the key assumptions it accepted and proceed.
- If it returns `confirm`, ask its one recommended confirmation question and wait for the answer.
- If it returns `grill`, show its numbered grill mode picker before freezing the plan:
  1. Auto-answer with recommended defaults (Recommended)
  2. Quick grill
  3. Deep grill
- Run the full one-question-at-a-time interview only when the user selects `3`, says "deep grill", or explicitly asks to be grilled deeply.

Treat the request as grill-candidate depth when any trigger is present:

- deadline, launch, production, customer-visible, or executive/high-impact wording
- staging vs production, partial vs full rollout, rollback posture, or ownership is unclear
- acceptance criteria are not measurable enough to prove the plan is done
- terms are overloaded or likely to conflict with `CONTEXT.md`, ADRs, AW docs, repo docs, or code
- the ask spans multiple repos, teams, services, environments, or external systems
- Auth, DNS, CI/CD, permissions, tenant isolation, security, data migration, or public contract decisions are involved
- existing AW docs or repo evidence can answer facts but not the user's intent, risk tolerance, or business priority

Do not skip `grill-with-docs` only because code or PR evidence exists. Explore facts locally when possible, then ask the user only for the remaining decision.
Do not let `/aw:plan` choose a shortcut before `grill-with-docs` runs.
Do not choose deep grill implicitly; the user must select `3` or explicitly ask for deep grill.

## Planning Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `product` | problem, scope, or acceptance criteria are unclear — start with a conversation to understand the user's needs before writing anything | `requirements.md`, `prd.md`, `state.json` |
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
- do not require `prd.md` for a technical request that is already clear enough for `spec.md`
- do not publish tracker issues from `to-issues` unless explicitly requested

## Human HTML Companion

Markdown planning artifacts remain canonical for agents.
When planning writes or materially updates `prd.md`, `design.md`, `spec.md`, or `tasks.md`, also create or refresh a human-readable HTML companion. HTML sidecars are required stage outputs, not advisory metadata.

Delegate to the `aw:echo` subagent for the companion instead of hand-rolling stage-local HTML.
`aw:echo` is not a slash command or direct tool. Invoking `/aw:plan` in default `dual` mode is explicit authorization to spawn exactly one `aw:echo` subagent for HTML companion generation; do not skip HTML only because no direct command is available.
Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar before the final handoff unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, do not hand-roll or command-generate HTML. Record the companion as `blocked` with the exact Echo availability blocker, keep Markdown canonical, and stop the stage handoff with `HTML Companion: blocked`.
Resolve output mode as: explicit user request for Markdown-only -> otherwise `dual`. `.aw_docs/config.json` and `AW_DOCS_OUTPUT_MODE` may request `dual` or `html`, but must not silently suppress required SDLC HTML sidecars.

Write each planning companion beside its canonical source: `prd.md` -> `prd.html`, `design.md` -> `design.html`, `spec.md` -> `spec.html`, and `tasks.md` -> `tasks.html`.
Choose the smallest correct profile for the dominant planning output:

- `prd` for product requirements
- `technical-spec` for technical `spec.md` or architecture-heavy `design.md`
- `implementation-plan` for `tasks.md` or full planning packets
- `impact-analysis-report` when the plan is primarily blast radius, impact, or tradeoff analysis

Pass every canonical source path that shaped each companion, then record colocated sidecars in `state.json` `html_companion_artifacts` with `source_path`, `html_path`, profile, status, `run_ref` when available, publish status, and any explicit Markdown-only skip or Echo-blocked reason.

## Plan Document Template

### `prd.md`

Capture:

- goal
- scope
- non-goals
- assumptions and constraints
- acceptance criteria
- risks, mitigations, or dependencies

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
- current state and relevant existing patterns
- scope
- non-goals
- assumptions and constraints
- non-functional requirements when relevant
- interfaces or contracts
- technical approach
- architecture rationale for non-obvious decisions
- decision and alternatives considered for major technical choices
- failure modes
- invariants or compatibility rules that must stay true
- testing strategy
- acceptance criteria
- verification targets
- expected changed files or modules when those can be inferred safely
- observability, debugging, or operator-facing constraints when relevant
- operations and rollback verification when relevant
- ADR-needed decision when the change has durable architectural impact
- rollback, migration, or backward-compatibility constraints when relevant
- key commands, migrations, or rollout constraints that execution must honor

### `tasks.md`

Canonical internal owner: `aw-tasks`

Start with a short header and an explicit `## Spec Brief` section that captures:

- feature goal
- spec brief
- architecture summary
- execution route: `/aw:build`
- expected execution mode when it is known safely
- expected chunk review mode when it is known safely

Before task sections, map the file structure:

- exact files to create
- exact files to modify
- exact tests to add or update
- the responsibility of each file when that can be stated clearly

Organize the work into explicit phases before listing slices:

- always label the execution order with headings such as `## Phase 1`, `## Phase 2`, and so on
- give each phase a short outcome statement so the next worker knows what should be true when that phase ends
- use phases to show dependency order, not to create abstract ceremony

Break implementation into small, executable chunks with:

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

- write the RED test or capture the exact failing proof first
- run the exact command to verify the RED failure is real
- write the minimal change
- rerun the exact command to confirm GREEN
- simplify or refactor while keeping the same proof green
- commit the focused slice

For behavior-changing slices, planning should default to explicit `RED -> GREEN -> REFACTOR` language rather than vague "add tests" instructions.
If test-first is not meaningful, say why and name the best pre-change proof plus post-change validation instead of silently weakening the contract.

Each step should usually be small enough to fit in about 2-5 minutes.
Use `../../references/task-sizing-and-checkpoints.md` when sizing or checkpointing gets fuzzy.

## Execution-Ready Tasks

`tasks.md` is not complete until a fresh worker can execute it without rediscovering the plan.

Execution-ready tasks should make it obvious:

- what `## Spec Brief` says at the top of the plan
- which phases exist and what each phase is meant to deliver
- which files change first
- which validation command or evidence target proves each slice
- which reviewer path is expected when it is known safely
- which steps are safe to parallelize
- which `parallel_group` and `parallel_write_scope` belong to those steps
- what `max_parallel_subagents` cap build should honor for that plan
- which slice should produce the next save-point commit
- which blocker should send execution back to planning instead of guessing

## Plan Richness

When the request is in `technical`, `tasks`, or `full` mode, planning should be specific enough that execution does not have to rediscover the shape of the work.

Prefer including:

- an explicit `## Spec Brief` section at the top of `tasks.md`
- exact or likely changed files and what each one is responsible for
- exact file paths when they can be inferred safely
- explicit phase headings for the task plan
- explicit assumptions, constraints, and risks when they materially affect execution order
- concrete task goals
- checkbox execution steps for non-trivial work
- exact commands and expected outcomes — use exact RED and GREEN commands for behavior-changing work
- explicit refactor or simplification follow-up after GREEN when behavior-changing work is non-trivial
- the minimal validation commands or evidence expected after implementation
- commit boundaries for meaningful slices
- save-point commit expectations for meaningful slices
- sequencing notes for dependent tasks
- bounded parallel candidates for disjoint work
- explicit `parallel_group`, `parallel_ready_when`, and `parallel_write_scope` notes when work may fan out
- a `max_parallel_subagents` cap that defaults to `3` unless a different cap is explicitly justified
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

1. confirm each spec requirement maps to a task or explicit reason it is out of scope
2. confirm `## Spec Brief` at the top of `tasks.md` matches the approved spec
3. confirm the phase order is obvious and every phase has a clear outcome
4. confirm assumptions, constraints, and risks are written down where they materially affect execution
5. scan for placeholders and vague steps
6. check that file paths, type names, helper names, and commands stay consistent
7. confirm behavior-changing slices use explicit `RED -> GREEN -> REFACTOR` wording or explicitly justify why test-first is not meaningful
8. confirm the next stage can route directly to `/aw:build` and that execution mode plus review mode are clear when they can be known safely
9. confirm every written planning Markdown artifact has a colocated HTML sidecar, or the user explicitly requested Markdown-only

Treat this as the planning verification pass.
If the plan cannot survive this self-review, it is not ready for execution handoff.

## Execution Handoff

When `tasks.md` is ready:

- recommend `/aw:build`
- name the selected execution mode when it is known safely
- name the selected chunk review mode when it is known safely
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
- assumptions or constraints that materially shape execution
- planned save-point commit policy
- parallel build policy and cap when parallel execution is planned
- `html_companion_artifacts`
- recommended next commands

## Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not run docs publish commands in this stage. Add Echo's returned links to the final `Remote Docs` section. If Echo cannot generate or publish, record `publish_status: blocked` and Echo's blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Route`
- `Mode`
- `Created`
- `Spec Brief`
- `Phases`
- `Execution Readiness`
- `Execution Mode`
- `HTML Companion`
- `Remote Docs`
- `Missing`
- `Next`
