# AW Eval Benchmark Scorecard

This scorecard defines how we benchmark the `aw-ecc` eval suite now that the Addy-parity lifecycle layer is implemented.

Benchmarking here means:

- measuring coverage, not just existence
- tracking pass-rate targets across deterministic and routing evals
- making regressions obvious when routing or skill selection drifts

This document focuses on two benchmarkable buckets:

- `deterministic/` = contract checks
- `routing/` = routing checks

The third bucket, `outcomes/`, is the outcome-check layer. It is governed by [aw-sdlc-outcomes-eval-checklist.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-sdlc-outcomes-eval-checklist.md) and should be read as the end-to-end artifact and release-outcome suite.

The machine-readable source of truth for benchmark thresholds is [aw-eval-benchmark-scorecard.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-eval-benchmark-scorecard.json).

For the high-level structure behind these buckets, see [aw-testing-strategy.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-testing-strategy.md).

## Terminology

The current repo folder names can sound too similar at first glance. Use this mental model:

- deterministic = "is the contract correct?"
- routing = "does the model route correctly?"
- outcomes = "did the workflow produce the outcome correctly?"

## Deterministic Benchmark

These checks should stay at or near 100% because they are repo-contract tests, not flaky runtime tests.

| Metric | Target |
|---|---|
| lifecycle skill coverage | `100%` |
| validation fixture sync | `100%` |
| trigger-matrix coverage | `100%` |
| top use case count | `>= 10` |
| archetype scenario count | `>= 8` |
| product scenario count | `>= 8` |
| RevEx history case count | `>= 8` |
| auto-intent case count | `>= 14` |

Sources:

- [aw-addy-validation-cases.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-addy-validation-cases.json)
- [aw-archetype-scenarios.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-archetype-scenarios.json)
- [aw-product-scenarios.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-product-scenarios.json)
- [aw-revex-history-benchmark.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-revex-history-benchmark.json)
- [aw-addy-validation-matrix.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/deterministic/capability/aw-addy-validation-matrix.test.js)
- [aw-archetype-scenarios.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/deterministic/scenarios/aw-archetype-scenarios.test.js)
- [aw-product-scenarios.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/deterministic/scenarios/aw-product-scenarios.test.js)
- [aw-revex-history-benchmark.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/deterministic/history/aw-revex-history-benchmark.test.js)
- [aw-sdlc-skill-trigger-coverage.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/deterministic/capability/aw-sdlc-skill-trigger-coverage.test.js)

## Live Benchmark

These checks measure whether the live CLI actually routes prompts the way the static contract expects.

### Craft-skill routing targets

| Metric | Target |
|---|---|
| craft-skill live case count | `>= 10` |
| route accuracy | `>= 90%` |
| primary skill accuracy | `>= 90%` |
| supporting skill accuracy | `>= 85%` |
| recommended sample size | `3 runs per case` |

Source fixture:

- [aw-live-craft-skill-cases.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-live-craft-skill-cases.json)

Live harness:

- [aw-craft-skill-routing.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/routing/aw-craft-skill-routing.test.js)

### Existing stage-routing targets

The stage-routing layer should continue using the existing live evals:

- [aw-archetype-routing.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/routing/aw-archetype-routing.test.js)
- [aw-stage-routing-updated.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/routing/aw-stage-routing-updated.test.js)
- [aw-sdlc-customer-behavior.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/routing/aw-sdlc-customer-behavior.test.js)
- [aw-sdlc-codex-routing.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/routing/aw-sdlc-codex-routing.test.js)

## Benchmark Interpretation

Use the scorecard like this:

1. Deterministic failures mean the contract itself drifted.
2. Live failures mean the model is not reliably following the contract.
3. Route accuracy below target means the router language or prompt pack needs work.
4. Supporting-skill accuracy below target means the craft-skill discoverability is still weak even if the public route is correct.
5. RevEx history failures mean the benchmark harvest or stored baseline artifacts are drifting away from real source history.

## Recommended Benchmark Runs

### Fast local benchmark

- `node tests/evals/deterministic/capability/aw-addy-validation-matrix.test.js`
- `node tests/evals/deterministic/scenarios/aw-archetype-scenarios.test.js`
- `node tests/evals/deterministic/scenarios/aw-product-scenarios.test.js`
- `node tests/evals/deterministic/history/aw-revex-history-benchmark.test.js`
- `node tests/evals/deterministic/capability/aw-sdlc-skill-trigger-coverage.test.js`
- `node tests/evals/deterministic/capability/aw-eval-benchmark-scorecard.test.js`

### Focused live benchmark

Run a representative subset from [aw-live-craft-skill-cases.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-live-craft-skill-cases.json), then compare actual pass rates with the thresholds above.

Examples:

- `AW_SDLC_CRAFT_SKILL_CASE=idea-refine-route node tests/evals/routing/aw-craft-skill-routing.test.js`
- `AW_SDLC_CRAFT_SKILL_CASE=browser-proof-route node tests/evals/routing/aw-craft-skill-routing.test.js`
- `AW_SDLC_CRAFT_SKILL_CASE=ci-cd-route node tests/evals/routing/aw-craft-skill-routing.test.js`
- `AW_SDLC_ARCHETYPE_CASE=microservice-contract-plan node tests/evals/routing/aw-archetype-routing.test.js`

## Current Status

- deterministic benchmark: green
- RevEx history benchmark:
  - harvested from local RevEx repos on April 6, 2026
  - backend benchmarkable cases: `20`
  - frontend benchmarkable cases: `20`
  - frontend status: shallow repo with `59` visible commits and explicit shallow-history warnings
- routing craft-skill benchmark:
  - first full 10-case sample run on April 5, 2026
  - route accuracy: `80%`
  - primary skill accuracy: `80%`
  - supporting skill accuracy: `100%`
  - current result: below target on route and primary skill accuracy
- outcomes benchmark:
  - checklist and artifact expectations are documented
  - broader outcome benchmarking is still pending expansion beyond the current outcomes-suite coverage
- full routing customer benchmark: still gated by known Codex live-output instability in some customer-behavior cases
