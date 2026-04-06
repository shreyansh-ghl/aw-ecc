# AW Addy Validation Matrix

This document defines how we test the Addy-parity layer in `aw-ecc`.

The goal is not only "the skills exist." The goal is:

- each parity skill has at least one concrete use case
- each case has an input and an expected outcome
- auto-intent routing chooses the right AW stage and supporting skills
- the stage model and the portable craft-skill model both remain understandable

The machine-readable source of truth lives in [tests/evals/fixtures/aw-addy-validation-cases.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-addy-validation-cases.json).

This matrix is the capability-layer source of truth. It proves skill coverage and route expectations, but it is not the full archetype-level or product-level scenario suite yet.

For the overall testing model, see [aw-testing-strategy.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-testing-strategy.md).

## Top Use Cases

| Use case | Input | Expected route sequence | Expected outputs |
|---|---|---|---|
| raw idea to build-ready plan | `Help me refine this idea for automated renewal reminders and turn it into an approved implementation plan.` | `idea-refine -> /aw:plan` | problem framing, recommended direction, assumptions, `spec.md`, `tasks.md`, `state.json` |
| backend API contract change | `Design the API contract, implement the approved retry endpoint change, test it, and tell me if it is ready for staging.` | `/aw:plan -> /aw:build -> /aw:test -> /aw:review` | contract-first design, `execution.md`, `verification.md`, readiness decision |
| frontend UI runtime proof | `Implement the approved dashboard widget redesign, verify responsive and accessibility behavior, and review it for staging readiness.` | `/aw:build -> /aw:test -> /aw:review` | responsive proof, accessibility proof, browser proof, `verification.md` |
| unclear bug to regression proof | `Investigate this worker retry alert, fix the confirmed issue, and prove the regression guard holds.` | `/aw:investigate -> /aw:build -> /aw:test -> /aw:review` | `investigation.md`, fault surface, `execution.md`, `verification.md` |
| safe simplification pass | `Simplify this already-working notification handler without changing behavior and make the history easy to review.` | `/aw:build -> /aw:review` | behavior-preserving simplification, clean save points, reviewable diff |
| security hardening flow | `Harden this auth callback boundary, validate the trust edges, test it, and tell me if it is ready to release.` | `/aw:build -> /aw:test -> /aw:review` | trust-boundary changes, security evidence, `verification.md` |
| performance optimization flow | `Measure why this task list render is slow, optimize it, and prove the improvement before review.` | `/aw:build -> /aw:test -> /aw:review` | baseline, optimization, after-measurement proof, `verification.md` |
| legacy migration release | `Plan the migration off the legacy webhook endpoint, implement the next slice, review it, deploy it, and prepare launch readiness notes.` | `/aw:plan -> /aw:build -> /aw:review -> /aw:deploy -> /aw:ship` | migration plan, deprecation path, `execution.md`, `verification.md`, `release.md` |
| release automation and closeout | `Create the PR, deploy this reviewed service to staging, and capture rollback and monitoring notes for launch.` | `/aw:deploy -> /aw:ship` | release action evidence, rollback posture, monitoring notes, `release.md` |
| full-flow automation | `Take this approved contact sync change from implementation-ready plan to staging end to end.` | `aw-yolo -> /aw:build -> /aw:test -> /aw:review -> /aw:deploy -> /aw:ship` | `execution.md`, `verification.md`, `release.md`, `state.json` |

## Per-Skill Test Cases

| Addy skill | Input | Expected public route | Expected AW / ECC skills | Expected outputs |
|---|---|---|---|---|
| `idea-refine` | `Help me refine this idea for a partner referral dashboard before we write the spec.` | `/aw:plan` | `aw-plan`, `idea-refine` | problem statement, recommended direction, assumptions, MVP scope, not-doing list |
| `spec-driven-development` | `Create the implementation spec for this approved retry-policy change. Do not make me write a PRD first.` | `/aw:plan` | `aw-plan`, `aw-spec` | `spec.md`, contracts, verification targets |
| `planning-and-task-breakdown` | `Break this approved spec into small executable implementation tasks with checkpoints.` | `/aw:plan` | `aw-plan`, `aw-tasks` | `tasks.md`, validation commands, checkpoint boundaries |
| `incremental-implementation` | `Implement the approved fix in thin reversible increments and keep rollback risk low.` | `/aw:build` | `aw-build`, `incremental-implementation` | thin slices, save points, `execution.md` |
| `context-engineering` | `Before you continue this implementation, repack the context because the session is drifting.` | `/aw:build` | `aw-build`, `context-engineering` | explicit context hierarchy, source-of-truth inputs |
| `frontend-ui-engineering` | `Implement this approved dashboard form with responsive states, accessibility, and design-system compliance.` | `/aw:build` | `aw-build`, `frontend-ui-engineering` | state coverage, responsive behavior, accessibility proof |
| `api-and-interface-design` | `Design the stable contract for this webhook retry API before anyone starts building it.` | `/aw:plan` | `aw-plan`, `api-and-interface-design` | contract-first design, validation rules, error semantics |
| `test-driven-development` | `Implement this approved bugfix with a failing test first and keep the regression proof tight.` | `/aw:build` | `aw-build`, `tdd-workflow` | failing test, minimal fix, passing proof |
| `browser-testing-with-devtools` | `Test this UI fix in the browser and inspect the DOM, console, and network calls before we clear it.` | `/aw:test` | `aw-test`, `browser-testing-with-devtools` | browser evidence, console findings, network findings |
| `debugging-and-error-recovery` | `Investigate this worker retry failure and tell me the likely fault surface before patching anything.` | `/aw:investigate` | `aw-investigate`, `aw-debug` | expected vs actual, fault surface, `investigation.md` |
| `code-review-and-quality` | `Review this change for correctness, security, performance, and staging readiness.` | `/aw:review` | `aw-review` | severity-tagged findings, readiness decision |
| `code-simplification` | `Simplify this already-working handler without changing behavior and keep the diff easy to review.` | `/aw:build` | `aw-build`, `code-simplification` | behavior-preserving cleanup, reduced complexity |
| `security-and-hardening` | `Harden this callback boundary and close the obvious trust and validation gaps.` | `/aw:build` | `aw-build`, `security-and-hardening` | boundary hardening, trust rules, security evidence |
| `performance-optimization` | `Measure why this page is slow, optimize the hot path, and keep the change bounded.` | `/aw:build` | `aw-build`, `performance-optimization` | baseline, targeted optimization, after-measurement proof |
| `git-workflow-and-versioning` | `Make this implementation in clean save points, keep the branch history reviewable, and note what you intentionally did not touch.` | `/aw:build` | `aw-build`, `git-workflow-and-versioning` | save points, clean commit boundaries, scope summary |
| `ci-cd-and-automation` | `Set up the release automation, preview gates, and rollback path for this service deployment.` | `/aw:deploy` | `aw-deploy`, `ci-cd-and-automation` | gate order, pipeline expectations, rollback path |
| `deprecation-and-migration` | `Plan the migration off the legacy webhook endpoint and show the deprecation path before we remove anything.` | `/aw:plan` | `aw-plan`, `deprecation-and-migration` | migration scope, replacement path, deprecation plan |
| `documentation-and-adrs` | `Record why we chose this queueing model and update the docs the next engineer will need.` | `/aw:review` | `aw-review`, `documentation-and-adrs` | ADR or rationale note, updated docs trail |
| `shipping-and-launch` | `Prepare the rollout, rollback posture, and monitoring notes for this reviewed release.` | `/aw:ship` | `aw-ship` | launch checklist, rollback readiness, monitoring notes |

## Auto-Intent Routing Cases

These are the natural-language prompts we expect the router to understand without the user naming a command.

| Input | Expected public route | Expected supporting skills | Expected outputs |
|---|---|---|---|
| `Help me refine this product idea before we write the spec.` | `/aw:plan` | `idea-refine` | recommended direction, problem statement |
| `Design a stable API contract for this approved retry interface change.` | `/aw:plan` | `api-and-interface-design` | contract-first design, `spec.md` |
| `Implement this approved frontend widget with responsive states and a11y.` | `/aw:build` | `frontend-ui-engineering`, `incremental-implementation` | `execution.md`, responsive and accessibility coverage |
| `Prove this UI fix in the browser by checking the DOM, console, and network requests.` | `/aw:test` | `browser-testing-with-devtools` | browser runtime evidence, `verification.md` |
| `Investigate this retry regression before you patch anything.` | `/aw:investigate` | `aw-debug` | fault surface, `investigation.md` |
| `Simplify this working code without changing behavior.` | `/aw:build` | `code-simplification` | behavior-preserving simplification, `execution.md` |
| `Harden this auth flow and validate the trust boundaries.` | `/aw:build` | `security-and-hardening` | hardening changes, security evidence |
| `Measure and optimize this slow render path.` | `/aw:build` | `performance-optimization` | baseline and after-measurement proof |
| `Keep this implementation in small save points and make the history reviewable.` | `/aw:build` | `git-workflow-and-versioning` | save-point history, change summary |
| `Set up the CI gates, preview deploy, and rollback path for this release.` | `/aw:deploy` | `ci-cd-and-automation` | pipeline gates, `release.md` |
| `Plan the migration off the legacy endpoint and tell me how to retire it safely.` | `/aw:plan` | `deprecation-and-migration` | migration path, deprecation plan |
| `Record why we chose this architecture and update the docs trail.` | `/aw:review` | `documentation-and-adrs` | ADR or rationale note, updated docs |
| `Prepare the launch checklist, rollback notes, and monitoring plan for this release.` | `/aw:ship` | `ci-cd-and-automation`, `documentation-and-adrs` | launch checklist, rollback posture, release notes |
| `Take this approved change end to end from plan to staging for me.` | `aw-yolo` | `aw-plan`, `aw-build`, `aw-test`, `aw-review`, `aw-deploy`, `aw-ship` | `execution.md`, `verification.md`, `release.md`, `state.json` |

## How We Know It Works

We validate this with three execution buckets:

1. Deterministic contract checks:
   - every parity skill has at least one case
   - every case has input and expected output
   - every referenced ECC skill exists on disk
   - the route -> primary skill mapping matches the AW public surface
2. Trigger-matrix checks:
   - the natural-language prompts in `skills/using-aw-skills/tests/skill-trigger-cases.tsv` cover the cross-cutting craft skills as well as the stage routes
3. Live routing checks:
   - Codex/Claude should be run against a representative subset of these prompts to verify the router actually mentions the expected route and supporting skills
4. Real outcome checks:
   - once routing is correct, the end-to-end suites should verify the expected artifacts and release outcomes for the same scenarios where applicable

In plain language:

- deterministic = contract correctness
- live = routing correctness
- real = outcome correctness
