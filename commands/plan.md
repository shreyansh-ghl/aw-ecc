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
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, load `platform-core:human-collaboration-artifacts` and run direct HCA execution in the same turn. Do not freehand or command-template HTML outside that skill contract. Record successful direct HCA execution as `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and `echo_agent_status: unavailable` with the exact Echo availability reason; do not record successful HCA output as `generated_fallback` or `generated_hca_fallback`. Keep Markdown canonical and include HCA/Echo provenance in the final handoff.
Codex spawn shape: when using Codex multi-agent tools, spawn the `echo` agent role without a full-history fork. If a full-history fork is required by the harness, omit `agent_type`, `model`, and `reasoning_effort` because forked agents inherit those fields.

The same requirement applies when `/aw:plan` reuses an existing build-ready planning folder. Before saying "the plan already exists", inspect `state.json` and the colocated sidecars. If any expected planning companion is missing, stale, blocked, local-only, recorded with a legacy uncontrolled fallback status such as `generated_hca_fallback`, or missing HCA/Echo-returned remote links in `dual` or `html` mode, run the HCA/Echo handoff and remote sharing repair before the final response.
When the existing plan already has `generated`, `generated_echo`, `html_generated_and_published`, or `published` companions, include the absolute TeamOfOne URL and GitHub link/folder in the final response. Prefer `.aw_docs/last-publish.json` `remoteUrl` values or `AW_DOCS_PUBLIC_BASE_URL` plus the published path; relative `/too/docs/...` paths are not enough when a public base URL is configured. A build-ready plan without remote links in the chat handoff is not complete for humans.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `run_ref` when available, publish status, remote links, and any explicit Markdown-only skip, HCA/Echo provenance, or blocked reason.

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
15. Generate, repair, or explicitly record the HTML companion status before handoff; `ready_for_build` is not sufficient when human HTML or remote links are stale or absent.

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
- do not treat an existing `ready_for_build` plan as handoff-ready while HCA/Echo HTML companions or remote links are missing, stale, fallback-only, blocked, local-only, or unpublished

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

## HCA/Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only or Markdown-only docs. This handoff is also required as a repair step for existing plan folders with stale, fallback, blocked, local-only, or unpublished companions. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.
For Codex, use the valid Echo spawn shape: `agent_type: "echo"` without a full-history fork. If the harness requires a full-history fork, omit `agent_type`, `model`, and `reasoning_effort`.

Do not duplicate docs publish commands or publish configuration in this stage. The HCA/Echo handoff owns HTML generation and remote sharing. Before the final response, inspect the HCA/Echo handoff result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute URLs, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: <absolute repository URL>` when HCA/Echo returns or records both; never collapse them to bare `TeamOfOne` and `GitHub` labels, Markdown-only hidden links, or any other shorthand without visible URL strings. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.
If HCA/Echo links already exist in `state.json` or `.aw_docs/last-publish.json`, still include them in `Remote Docs`; prefer absolute TeamOfOne URLs from `.aw_docs/last-publish.json`.

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
