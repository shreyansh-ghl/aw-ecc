# Eval Suites

This directory groups the existing eval catalog into suite-sized manifests.

Use these manifests when you want to understand a family of evals without scanning every file in `deterministic/`, `routing/`, and `outcomes/`.

The structure is:

- `capability/` for routing contracts, shared references, stage contracts, and parity coverage
- `scenarios/` for archetype and product scenario suites
- `history/` for git-history reconstruction benchmarks

The root index at [suites.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/suites.json) points to every suite manifest here.

The suite runner can execute any named suite directly:

- `node tests/evals/run-aw-suite.js --list`
- `node tests/evals/run-aw-suite.js core-routing-surface`
- `node tests/evals/run-aw-suite.js core-routing-surface deterministic`
