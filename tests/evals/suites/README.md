# Eval Suites

This directory groups the existing eval catalog into suite-sized manifests.

Use these manifests when you want to understand a family of evals without scanning every file in `deterministic/`, `routing/`, and `outcomes/`.

The active structure is:

- `capability/` for active capability and benchmark coverage

The root index at [suites.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/suites.json) points to every suite manifest here.

The suite runner can execute any named suite directly:

- `node tests/evals/run-aw-suite.js --list`
- `node tests/evals/run-aw-suite.js addy-parity-and-benchmark-contracts`
- `node tests/evals/run-aw-suite.js addy-parity-and-benchmark-contracts deterministic`
