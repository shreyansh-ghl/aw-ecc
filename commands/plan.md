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
- colocated HTML sidecars beside generated planning artifacts, for example `prd.html`, `design.html`, `spec.html`, and `tasks.html`, when docs output mode is `dual` or `html`

## Human HTML Companion

Markdown artifacts remain canonical for agents.
When `/aw:plan` writes or materially updates planning artifacts, delegate to the `aw:echo` subagent to produce the TeamOfOne-readable companion. Markdown-only is allowed only when the user explicitly requests it for this run.
Subagent authorization: invoking `/aw:plan` in `dual` or `html` output mode is an explicit user request to delegate the human-facing HTML companion to exactly one background `aw:echo` subagent. This authorization is scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, create a conservative self-contained fallback HTML sidecar in the same turn, record `generated_fallback` with the blocker, and keep Markdown canonical.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `run_ref` when available, publish status, and any explicit Markdown-only skip or fallback reason.

## Execution Rules

1. Classify the request into one primary mode first.
2. Always invoke `grill-with-docs` as the Decision Confidence Gate before writing artifacts, then follow its returned depth: proceed, ask one confirmation question, or show the numbered grill mode picker.
3. Treat deadline, launch, production, customer-visible, multi-repo, Auth/DNS/CI/CD/permissions, tenant isolation, rollback, ownership, or non-measurable acceptance criteria as grill-candidate triggers unless repo evidence fully resolves them.
4. When grilling is needed, let the user choose depth by number: `1` auto-answer recommended defaults, `2` quick grill, or `3` deep grill. Run the full one-question-at-a-time interview only when the user selects `3` or explicitly says deep grill.
5. Use `to-prd` only when product scope must be frozen (`product` or `full` mode, or missing product assumptions); do not require a PRD for a technical request that is already well defined.
6. Use `to-issues` before `tasks.md` when the work needs a vertical-slice breakdown; feed those slices into `aw-tasks` rather than publishing tracker issues by default.
7. Operate in read-only planning mode until the artifacts are written.
8. Default to single-scope planning.
9. If the request is fuzzy, discovery-heavy, or too large for one spec, route internally through `aw-brainstorm` before technical planning.
10. Use existing artifacts as inputs when they are already sufficient.
11. Route approved technical direction through `aw-spec` before task planning.
12. Route approved specs through `aw-tasks` when execution-ready tasks are missing or stale.
13. When writing technical or task artifacts, make them concrete enough for build to proceed without re-planning file scope, validation, and task order.
14. When writing `tasks.md`, always include an explicit `## Spec Brief` section and organize the work into explicit phases.
15. Generate or explicitly record the HTML companion status before handoff.

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
- `Summary`
- `Execution Readiness`
- `HTML Companion`
- `Remote Docs`
- `Missing`
- `Next`
