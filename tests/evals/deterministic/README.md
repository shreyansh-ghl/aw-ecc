# Deterministic Evals

This directory now groups static repo-contract tests by family instead of keeping every deterministic test in one flat list.

Current layout:

- `capability/` — command surface, router behavior, stage contracts, parity checks, installability, and shared-reference checks
- `scenarios/` — archetype, product, BDD, and customer-coverage checks
- `history/` — git-history benchmark contracts such as RevEx reconstruction

Use the suite catalog for the shortest path to a named family:

- [suites.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/suites.json)
- [suites/](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/suites)

Use the deterministic runner when you want the whole contract layer:

- `bash tests/evals/run-aw-sdlc-evals.sh deterministic`

Use the suite runner when you want one deterministic family:

- `node tests/evals/run-aw-suite.js core-routing-surface deterministic`
- `node tests/evals/run-aw-suite.js archetype-and-product-scenarios deterministic`
- `node tests/evals/run-aw-suite.js revex-history-benchmark deterministic`
