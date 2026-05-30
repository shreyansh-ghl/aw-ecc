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

Markdown planning artifacts remain canonical for agents.
When `/aw:plan` writes or materially updates planning artifacts, HTML sidecars are required in `dual` and `html` output modes. Use `platform-core:echo-direct` directly to generate or refresh the colocated planning `.html` companions such as `prd.html`, `design.html`, `spec.html`, and `tasks.html` with the profile selected by `platform-core:echo-direct` from the artifact type.

Resolve docs output mode in this order: explicit user or session request, stage-local request, `.aw_docs/config.json` `docs.outputMode`, `AW_DOCS_OUTPUT_MODE`, then default `dual`.
- `dual` mode keeps Markdown canonical and requires the HTML companion.
- `html` mode requires the HTML companion and still preserves any canonical Markdown the stage must write.
- explicit Markdown-only mode skips HTML and records `status: skipped` with `skip_reason: explicit_markdown_only`.

Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`. In `dual` or `html` mode, the stage is not complete until the skill has generated the sidecar or recorded a concrete blocker. In explicit Markdown-only mode, do not generate HTML.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, `status: generated` when successful, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason. Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.
After Echo Direct writes the companion packet, run `aw docs validate --feature <feature_slug> --full`. Do not mark the plan `ready_for_build`, recommend `/aw:build`, or say the plan is complete while that validator reports missing Markdown, missing `.html` sidecars, missing `html_companion_artifacts`, or incomplete Echo Direct provenance.

Write each planning companion beside its canonical source: `prd.md` -> `prd.html`, `design.md` -> `design.html`, `spec.md` -> `spec.html`, and `tasks.md` -> `tasks.html`.

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
16. Run `aw docs validate --feature <feature_slug> --full` before marking the plan complete or recommending `/aw:build`; if it fails, keep the stage in `/aw:plan` repair or record a concrete blocker.

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
- do not treat an existing `ready_for_build` plan as handoff-ready while Echo Direct HTML companions or remote links are missing, stale, fallback-only, blocked, local-only, or unpublished

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

## Echo Direct Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for every required human companion in `dual` or `html` mode. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent. This same skill is also the repair path for existing folders with missing, stale, blocked, local-only, legacy uncontrolled fallback, unpublished, or linkless companions. Then run `aw docs validate --feature <feature_slug> --full`; validation failure means the handoff is still `/aw:plan` repair, not `/aw:build`.

Do not duplicate docs publish commands or publish configuration in this stage. `platform-core:echo-direct` owns HTML generation, publish handoff, companion state updates, and returned Devtools/GitHub links. Before the final response, inspect the skill result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as plain-text absolute Devtools URLs rooted at `https://devtools.servers.stg.msgsndr.net/` (no Markdown link syntax around the Devtools URL) with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `Devtools: <absolute remote URL>` as raw visible text and `GitHub: [spec.html](<absolute repository URL>)` or another short artifact label when both URLs are available. Never render Devtools as `[Devtools](...)`, `[Spec Devtools](...)`, or any other Markdown link label; never hide the Devtools URL behind Markdown-only links, never print long GitHub URLs inline when a compact label can point to the same URL, and never invent links. If publishing cannot run, record `publish_status: blocked` and the concrete blocker in `state.json`.

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
