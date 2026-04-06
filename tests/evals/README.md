# AW SDLC Eval Layout

This suite is organized by execution mode instead of one flat directory.

The directory names are historical and easy to misread, so use these plain-English meanings:

- `deterministic/` — contract checks: static repo, fixture, and mapping validation with no model-in-the-loop routing
- `routing/` — routing checks: model-in-the-loop tests that verify stage selection, skill selection, and response structure
- `outcomes/` — outcome checks: end-to-end tests that materialize real workspaces or validate real artifact and release outcomes
- `fixtures/` — shared prompt and case data
- `lib/` — shared helpers for snapshots, eval workspaces, baseline parsing, and release generation

Use these bucket names consistently:

- `deterministic/` -> contract checks
- `routing/` -> routing checks
- `outcomes/` -> outcome checks

These mode buckets are not the same thing as scenario layers. The higher-level testing strategy lives in [docs/aw-testing-strategy.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-testing-strategy.md), which explains:

- capability-layer cases
- archetype-layer cases
- product-layer cases
- benchmark measurement across those layers

Runner scripts remain at the `tests/evals/` root:

- `run-aw-sdlc-evals.sh`
- `run-aw-sdlc-outcomes-parallel.sh`
- `run-aw-sdlc-routing-golden-path.sh`
- `run-aw-sdlc-ghl-ai-standalone-smoke.sh`

RevEx Phase 2 can now be run explicitly with:

- `bash tests/evals/run-aw-sdlc-evals.sh revex-history`
- `bash tests/evals/run-aw-sdlc-evals.sh revex-history-smoke`

The smoke mode runs the current known-good backend plus frontend pair so cross-domain regressions surface quickly before wider sampling.

When adding a new test, place it in the narrowest mode bucket possible and keep shared data in `fixtures/` or `lib/` rather than duplicating helpers across suites.

Benchmark-oriented fixtures and docs now live here too:

- `fixtures/aw-addy-validation-cases.json` — top use cases, per-skill cases, and auto-intent cases with expected outputs
- `fixtures/aw-archetype-scenarios.json` — repo-archetype scenarios for microservice, worker, and microfrontend coverage
- `fixtures/aw-product-scenarios.json` — product-specific GHL scenarios for real golden-path coverage
- `fixtures/aw-history-benchmark-packs.json` — benchmark-pack registry for multi-repo history reconstruction suites such as RevEx and future repo combinations
- `fixtures/aw-revex-history-benchmark.json` — real git-history reconstruction benchmark cases harvested from the selected benchmark pack, with sparse ticket prompts, task cards, baseline cards, and stored baseline PR artifacts
- `fixtures/aw-revex-history-judge-rubric.md` — baseline-versus-candidate scoring rubric for the history benchmark
- `outcomes/aw-revex-history-phase2.test.js` — Phase 2 candidate-generation and judging loop for selected RevEx benchmark cases
- RevEx Phase 2 now also writes `case-profile.json`, `system-validation.txt`, `quality-gates.json`, and `result-card.json` per case so the harness can auto-repair likely under-reconstruction before judging and leave behind a compact result summary
  - this benchmark is intentionally PR-parity focused; design fidelity and dedicated UI evidence should live in separate eval families
- Longer-run history benchmark tracing now lives in `tests/results/history-benchmark-run-ledger.jsonl`, `tests/results/history-benchmark-scoreboard.json`, and `tests/results/history-benchmark-scoreboard.md`
- `fixtures/aw-live-craft-skill-cases.json` — focused live routing prompts for the new craft-skill layer
- `fixtures/aw-eval-benchmark-scorecard.json` — benchmark thresholds for deterministic and live accuracy
- `schemas/` — JSON schemas for eval fixtures and future scenario layers
- `docs/aw-testing-strategy.md` — high-level strategy for layers, modes, and storage
- `docs/aw-addy-validation-matrix.md` — human-readable validation matrix
- `docs/aw-archetype-scenario-matrix.md` — human-readable archetype matrix
- `docs/aw-product-scenario-matrix.md` — human-readable product scenario matrix
- `docs/aw-revex-history-benchmark.md` — human-readable history-reconstruction benchmark design
- `docs/aw-eval-benchmark-scorecard.md` — benchmark scorecard and target definitions
