# AW Testing Strategy

This document explains how `aw-ecc` testing is structured at a high level.

For the concrete release gate for Cursor, Codex, and Claude routing behavior, also read:

- [aw-cross-harness-routing-test-strategy.md](/private/tmp/aw-ecc-cursor-routing-fixes-clean/docs/aw-cross-harness-routing-test-strategy.md)

The most important distinction is that we track three different dimensions:

1. ownership: which commands, skills, and supporting assets a suite validates
2. scenario layers: what kind of workflow or business case we are testing
3. execution modes: how we test it

## Ownership View

Start with [tests/evals/suites.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/suites.json) when you want the shortest path from repo behavior to eval coverage.
That root index points to suite manifests under [tests/evals/suites](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/suites), which is now the easiest way to understand one eval family at a time.

That manifest answers:

- which command or skill owns a suite
- which test files belong to that suite
- which fixtures feed it
- which docs explain it

This is the preferred navigation view when the repo grows.
The physical buckets still matter for execution, but ownership should be the first reading path for humans.

Owner-local eval definitions now live next to the behaviors they validate when that improves discoverability:

- `skills/*/evals/` for skill-owned trigger cases and stage cases
- `agents/evals/` for agent-owned scenarios

Central runners, shared schemas, benchmark harnesses, and result ledgers stay under `tests/evals/` and `tests/results/`.

## Execution Modes

These are the current repo buckets under `tests/evals/`.

| Repo bucket | Plain-English meaning | What it proves |
|---|---|---|
| `deterministic/` | contract checks | the repo contract, fixtures, mappings, and coverage are correct |
| `routing/` | routing checks | the model chooses the correct public route, primary stage skill, and supporting skills |
| `outcomes/` | outcome checks | the workflow produces the expected artifacts, release evidence, or end-to-end results |

Simple mental model:

- deterministic = "is the contract correct?"
- routing = "does the model route correctly?"
- outcomes = "did the workflow produce the outcome correctly?"

Use these repo buckets directly:

- contract checks
- routing checks
- outcome checks

## Scenario Layers

These layers describe what kind of prompt or workflow the case represents.

| Layer | Purpose | Current status |
|---|---|---|
| capability | prove skill coverage, stage coverage, and Addy-parity behavior | implemented |
| archetype | prove correct behavior by repo type such as microservice, worker, and microfrontend | implemented (baseline) |
| product | prove correct behavior for real GHL product flows and golden scenarios | implemented (baseline deterministic) |
| history | prove AW can reconstruct real shipped work from sparse ticket prompts grounded in git history | implemented (baseline deterministic) |

## Current Implemented Coverage

Today the implemented strategy is strongest in the capability layer:

- Addy-parity lifecycle skill coverage
- per-skill validation cases
- auto-intent routing cases
- archetype scenario cases for microservice, worker, and microfrontend
- product scenario cases for Communities, Payments, Memberships, Contacts, Automation, and Workflows
- RevEx history reconstruction cases harvested from a named benchmark pack grounded in real frontend and backend git history
- craft-skill routing benchmark
- archetype routing benchmark harness
- outcome artifact and release-outcome checklists

Primary sources:

- [aw-addy-validation-matrix.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-addy-validation-matrix.md)
- [aw-archetype-scenario-matrix.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-archetype-scenario-matrix.md)
- [aw-product-scenario-matrix.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-product-scenario-matrix.md)
- [aw-revex-history-benchmark.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-revex-history-benchmark.md)
- [aw-eval-benchmark-scorecard.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-eval-benchmark-scorecard.md)
- [aw-sdlc-outcomes-eval-checklist.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-sdlc-outcomes-eval-checklist.md)

## How The Pieces Fit

### Capability layer

Purpose:

- prove every Addy-parity skill has at least one concrete case
- prove each case has input, expected route, expected skill stack, and expected outputs
- prove the router understands natural-language prompts

Primary fixtures:

- [aw-addy-validation-cases.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-addy-validation-cases.json)
- [aw-live-craft-skill-cases.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-live-craft-skill-cases.json)

### Archetype layer

Purpose:

- prove AW behaves correctly for repo types like microservice, worker, and microfrontend
- prove deploy, test, and ship expectations vary correctly by archetype

This baseline layer now exists in machine-readable and doc form, but it still needs routing and outcome suites that execute these archetype scenarios directly.
There is now a focused routing harness for this layer, while the broader archetype outcome suite is still the next gap.

### Product layer

Purpose:

- prove ECC works for real GHL workflows, not only generic engineering prompts
- validate golden paths per domain or product area

This layer now exists as a deterministic baseline with machine-readable product scenarios and human-readable matrices.
Its next expansion is live routing and outcome execution for those same product cases.

### History layer

Purpose:

- prove AW can recover from vague, real-world change requests derived from shipped commits
- preserve a real baseline PR artifact for comparison
- prepare a judgeable benchmark for baseline versus candidate scoring

This layer now exists with harvested RevEx commit cases, stored sparse ticket prompts, stored baseline PR artifacts, a reusable judge rubric, and an opt-in Phase 2 outcomes runner that creates `commit^` workspaces and attempts candidate-plus-judge loops.
The history layer now also has pack metadata, task cards, baseline cards, result cards, a run ledger, and a scoreboard so we can track performance over time.
The remaining work is stabilization plus pack expansion: candidate generation still needs tighter runtime behavior and repeated smoke validation before the history benchmark is treated as production-ready across more repo combinations.

## Storage Standard

Use owner-local definitions where discovery matters, but keep execution centralized and machine-readable.

Machine-readable source of truth:

- `tests/evals/fixtures/*.json`
- `tests/evals/schemas/*.json`
- `tests/evals/suites.json`
- `tests/evals/suites/*.json`
- `skills/*/evals/*`
- `agents/evals/*`

Repo-executable checks:

- `tests/evals/deterministic/`
- `tests/evals/routing/`
- `tests/evals/outcomes/`

Within `tests/evals/deterministic/`, tests are now physically grouped by family:

- `capability/`
- `scenarios/`
- `history/`

Human-readable summaries:

- `docs/aw-testing-strategy.md`
- `docs/aw-addy-validation-matrix.md`
- `docs/aw-archetype-scenario-matrix.md`
- `docs/aw-product-scenario-matrix.md`
- `docs/aw-revex-history-benchmark.md`
- `docs/aw-eval-benchmark-scorecard.md`
- `docs/aw-sdlc-outcomes-eval-checklist.md`

Recommended future addition for historical benchmark runs:

- `tests/results/benchmark-runs/`
- `tests/results/history-benchmark-run-ledger.jsonl`
- `tests/results/history-benchmark-scoreboard.json`
- `tests/results/history-benchmark-scoreboard.md`

## Benchmarking

Benchmarking means measuring the eval system as a scorecard over time, not only checking whether a single test passes.

Current benchmark emphasis:

- deterministic coverage should remain near `100%`
- routing accuracy should meet the published thresholds
- outcome checks should validate artifact and release-evidence correctness

See:

- [aw-eval-benchmark-scorecard.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-eval-benchmark-scorecard.md)

## Recommended Validation Order

When changing routing, stage behavior, or skill anatomy:

1. run deterministic contract checks first
2. run focused routing checks for the affected stage or craft skill
3. run outcome checks when artifact or release behavior changed
4. only then treat the workflow change as production-ready

## Current Gap To Close

The current capability layer is strong, but the next confidence jump comes from adding:

1. outcome suites for the new archetype scenarios
2. routing and outcome suites for the product-specific golden scenarios
3. stabilization and repeat-run confidence for the new RevEx history benchmark Phase 2 loop
4. repeated routing benchmark runs so routing accuracy is tracked over time, not only as one-off samples

## Recommended Structural Rule

Keep executable evals centralized under `tests/evals`, but keep definitions close to owners when that improves comprehension:

- commands should be discoverable through suite ownership
- stage skills should keep trigger cases or local scenario definitions under `skills/*/evals/` when those cases explain the behavior
- agents should keep scenario definitions under `agents/evals/` when they have distinct review or orchestration behavior
- central deterministic, routing, and outcome runners should read those owner-local assets instead of duplicating them

That gives us central execution without losing local discoverability.
