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
When `/aw:build` writes or materially updates execution evidence, delegate to the `aw:echo` subagent with the `implementation-plan` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Subagent authorization: invoking `/aw:build` in `dual` or `html` output mode is an explicit user request to delegate the human-facing HTML companion to exactly one background `aw:echo` subagent. This authorization is scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. Record the companion as `queued` or `generating` while Echo runs. Treat missing direct commands, missing slash commands, and extra per-turn subagent-authorization prompts as harness blockers, not as permission to hand-roll HTML. If the tool layer truly cannot spawn `aw:echo`, do not create a stage-local fallback sidecar; record `status: blocked`, `publish_status: blocked`, and the exact Echo availability reason in `state.json`, then tell the user the Echo companion was not generated.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `run_ref` when available, publish status, and any explicit Markdown-only skip, HCA fallback reason, or blocked reason.

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

## Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not run docs publish commands in this stage. Add Echo's returned links to the final `Remote Docs` section. If Echo cannot generate or publish, record `publish_status: blocked` and Echo's blocker in `state.json`; do not invent links.

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
