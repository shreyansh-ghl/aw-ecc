# AW SDLC Eval Layout

This suite is organized by execution mode instead of one flat directory.

The fastest way to understand ownership is now [suites.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/suites.json).
That root index points to per-suite manifests under [tests/evals/suites](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/suites), where each suite maps back to the commands, skills, agents, and assets it validates.

The repo now uses a hybrid layout:

- owner-local eval definitions live near the thing they explain, such as `skills/*/evals/` and `agents/evals/`
- central execution, shared helpers, schemas, benchmark runners, and suite manifests stay in `tests/evals/`

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

Within `deterministic/`, the repo now also groups tests by family:

- `deterministic/capability/`
- `deterministic/scenarios/`
- `deterministic/history/`

That keeps the contract layer navigable even as the file count grows.

These mode buckets are not the same thing as scenario layers. The higher-level testing strategy lives in [docs/aw-testing-strategy.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-testing-strategy.md), which explains:

- ownership-first suite discovery
- capability-layer cases
- archetype-layer cases
- product-layer cases
- benchmark measurement across those layers

Runner scripts remain at the `tests/evals/` root:

- `run-aw-sdlc-evals.sh`
- `run-aw-sdlc-outcomes-parallel.sh`
- `run-aw-sdlc-routing-golden-path.sh`
- `run-aw-sdlc-ghl-ai-standalone-smoke.sh`

Default `npm test` / `node tests/run-all.js` behavior is intentionally narrower than the full benchmark stack:

- live routing tests under `evals/routing/` are opt-in via `AW_TEST_INCLUDE_ROUTING=1`
- slower outcome benchmarks like `outcomes/aw-sdlc-outcomes.test.js` and `outcomes/aw-revex-history-phase2.test.js` are opt-in via `AW_TEST_INCLUDE_SLOW_OUTCOMES=1`

That keeps the normal push gate deterministic and fast while preserving the heavier benchmark layers for explicit runs.

RevEx Phase 2 can now be run explicitly with:

- `bash tests/evals/run-aw-sdlc-evals.sh revex-history`
- `bash tests/evals/run-aw-sdlc-evals.sh revex-history-smoke`

The smoke mode runs the current known-good backend plus frontend pair so cross-domain regressions surface quickly before wider sampling.

When adding a new test, use this rule:

- keep prompts, local cases, and small golden scenarios near the owner when they explain a specific skill or agent
- keep reusable fixtures, schemas, shared helpers, and executable runners centralized
- point `tests/evals/suites.json` and `tests/evals/suites/*.json` at both so readers can start from either side

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
- `skills/using-aw-skills/evals/skill-trigger-cases.tsv` — owner-local routing prompt matrix for the AW router
- `skills/using-platform-skills/evals/platform-selection-cases.json` — owner-local platform-family routing cases
- `skills/aw-build/evals/build-stage-cases.json` — owner-local build-stage scenario definitions
- `skills/aw-deploy/evals/deploy-stage-cases.json` — owner-local deploy-stage scenario definitions
- `agents/evals/code-reviewer-scenarios.json` — owner-local code-review agent scenarios
- `suites.json` — root index for the suite catalog
- `suites/` — per-suite manifests grouped by capability, scenarios, and history
- `run-aw-suite.js` — run one named suite directly without remembering every test file, optionally filtered to `deterministic`, `routing`, or `outcomes`
- `schemas/` — JSON schemas for eval fixtures and future scenario layers
- `docs/aw-testing-strategy.md` — high-level strategy for layers, modes, and storage
- `docs/aw-addy-validation-matrix.md` — human-readable validation matrix
- `docs/aw-archetype-scenario-matrix.md` — human-readable archetype matrix
- `docs/aw-product-scenario-matrix.md` — human-readable product scenario matrix
- `docs/aw-revex-history-benchmark.md` — human-readable history-reconstruction benchmark design
- `docs/aw-eval-benchmark-scorecard.md` — benchmark scorecard and target definitions
