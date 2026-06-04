---
name: aw:build
description: Build approved work in thin, reversible increments using the resolved org standards and the smallest correct validation loop.
argument-hint: "<approved plan, spec, task, or implementation request>"
status: active
stage: build
internal_skill: aw-build
---

# Build

Use `/aw:build` to implement approved work.

This command owns implementation only.
It does not replace planning, and it must not silently deploy.

## Role

Implement approved work in thin, reversible slices, continue until the approved build scope is complete or blocked, then hand off cleanly to test and review instead of self-declaring success.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `code` | source code implementation | code changes, tests, `execution.md`, `state.json` |
| `infra` | Helm, Terraform, CI/CD, environment setup | infra/config changes, `execution.md`, `state.json` |
| `docs` | documentation-only work | docs changes, `execution.md`, `state.json` |
| `migration` | schema or data rollout | migration changes, rollback notes, `execution.md`, `state.json` |
| `config` | feature flags and runtime configuration | config changes, `execution.md`, `state.json` |

## Required Inputs

- approved planning artifact appropriate to the mode
- repo context
- relevant platform docs
- relevant `.aw_rules`
- resolved GHL baseline profile when it affects validation or rollout safety

## Outputs

- implementation changes
- tests or validation changes where applicable
- `.aw_docs/features/<feature_slug>/execution.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- `.aw_docs/features/<feature_slug>/execution.html` when docs output mode is `dual` or `html`

## Human HTML Companion

Markdown `execution.md` remains canonical for agents.
When `/aw:build` writes or materially updates execution evidence, HTML sidecars are required in `dual` and `html` output modes. Use `platform-core:echo-direct` directly to generate or refresh `.aw_docs/features/<feature_slug>/execution.html` with the `implementation-plan` profile.

Resolve docs output mode in this order: explicit user or session request, stage-local request, `.aw_docs/config.json` `docs.outputMode`, `AW_DOCS_OUTPUT_MODE`, then default `dual`.
- `dual` mode keeps Markdown canonical and requires the HTML companion.
- `html` mode requires the HTML companion and still preserves any canonical Markdown the stage must write.
- explicit Markdown-only mode skips HTML and records `status: skipped` with `skip_reason: explicit_markdown_only`.

Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`. In `dual` or `html` mode, the stage is not complete until the skill has generated the sidecar or recorded a concrete blocker. In explicit Markdown-only mode, do not generate HTML.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, `status: generated` when successful, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason. Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.

## Execution Rules

1. Load the approved planning input before changing code.
2. If the plan is underspecified, contradictory, or missing a critical dependency, stop and route back to `/aw:plan`.
3. Select the execution mode explicitly.
4. Default to sequential execution unless the approved plan marks disjoint `parallel_candidate` slices with explicit write scopes.
5. If parallel fan-out is approved, respect the plan’s `max_parallel_subagents` cap, defaulting to `3` when no stricter or larger value is justified.
6. Break non-trivial work into thin, rollback-friendly slices or bounded parallel waves.
7. For each slice that changes observable behavior, load `tdd-workflow` and follow RED-GREEN-REFACTOR; use the `tdd` companion skill when deeper behavior-test, mocking, or tracer-bullet guidance is needed.
8. Validate each slice or completed wave before expanding scope.
9. Keep moving through approved slices until the current build scope is complete or explicitly blocked.
10. For bug work, require a failing signal or reproduction before broad fixes.
11. For frontend work, inherit HighRise, accessibility, responsive, and runtime-verification expectations.
12. Record what changed, what remains, whether execution stayed sequential or ran in bounded parallel waves, and what was intentionally not touched.
13. If the approved tasks are phased, record each completed phase and name the next phase before handoff.
14. Create save-point commits for meaningful completed slices.
15. If a proposed slice cannot support a clean save-point commit, treat that as a slicing problem instead of normalizing a no-commit checkpoint.
16. Hand off to `/aw:test` or `/aw:review` with the exact next command instead of claiming readiness without evidence.
17. Generate or explicitly record the HTML companion status before handoff.

## Must Not Do

- must not reopen planning unless a true prerequisite is missing
- must not silently skip tests for code changes
- must not stop after a successful slice if approved build work still remains
- must not deploy as part of build

## Recommended Next Commands

- `/aw:test`
- `/aw:review`

## Echo Direct Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for every required human companion in `dual` or `html` mode. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent. This same skill is also the repair path for existing folders with missing, stale, blocked, local-only, legacy uncontrolled fallback, unpublished, or linkless companions.

Do not duplicate docs publish commands or publish configuration in this stage. `platform-core:echo-direct` owns HTML generation, publish handoff, companion state updates, and returned Devtools/GitHub links. Before the final response, inspect the skill result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as plain-text absolute Devtools URLs rooted at `https://devtools.servers.stg.msgsndr.net/` (no Markdown link syntax around the Devtools URL) with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `Devtools: <absolute remote URL>` as raw visible text and `GitHub: [spec.html](<absolute repository URL>)` or another short artifact label when both URLs are available. Never render Devtools as `[Devtools](...)`, `[Spec Devtools](...)`, or any other Markdown link label; never hide the Devtools URL behind Markdown-only links, never print long GitHub URLs inline when a compact label can point to the same URL, and never invent links. If publishing cannot run, record `publish_status: blocked` and the concrete blocker in `state.json`.

## Final Output Shape

Always end with:

- `Mode`
- `Approved Inputs`
- `Parallelization`
- `Phase Progress`
- `Increment Plan`
- `Completed Slices`
- `Remaining Build Scope`
- `Changes`
- `Validation`
- `Save Points`
- `HTML Companion`
- `Remote Docs`
- `Blockers`
- `Next`
