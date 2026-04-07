# AW RevEx History Benchmark

This benchmark family uses real RevEx commit history to create harder, less synthetic eval cases.

Instead of starting from a fully specified scenario, each case starts from a real shipped commit and works backward.
RevEx is currently one named benchmark pack inside a more general history-benchmark system, so we can add 4-5 more repo combinations without changing the core harness.

## Goal

For a selected commit from a selected history benchmark pack:

1. derive a sparse ticket-quality prompt from the shipped change
2. store a concrete task card that makes the target surface and success signals obvious
2. store the real shipped change as a baseline PR artifact
3. store a compact baseline card for quick commit-to-PR inspection
4. later run AW against a pre-change workspace using only the sparse ticket prompt
5. compare the AW candidate PR against the stored baseline with an LLM judge rubric
6. persist a result card and run ledger so performance can be tracked over time

## Why This Layer Exists

The current framework already covers:

- capability cases
- repo archetypes
- product scenarios
- routing and outcomes

What it does not yet prove is this:

Can AW recover from under-specified real-world work and still produce code and PR output comparable to what actually shipped?

This benchmark answers that question.

## Current Scope

For now, this benchmark family is intentionally narrow:

- optimize for commit reconstruction and PR-output parity
- compare changed surface, likely problem coverage, scope discipline, PR clarity, and narrow supporting evidence
- do not treat design fidelity or rich UI/browser evidence as required inside this loop

Design-focused evals and UI-evidence evals should live as separate benchmark families.

## Benchmark Pack

The current default benchmark pack is:

- `revex` — RevEx Frontend + Backend

Its current local sources are:

- [ghl-revex-frontend](/Users/prathameshai/Documents/Agentic%20Workspace/ghl-revex-frontend)
- [ghl-revex-backend](/Users/prathameshai/Documents/Agentic%20Workspace/ghl-revex-backend)

Pack definitions live in [aw-history-benchmark-packs.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-history-benchmark-packs.json).
This is the extension point for the next 4-5 repo combinations.
The fixture stores repo-relative paths rather than hardcoded machine-specific paths so the benchmark can resolve them from the `aw-ecc` workspace.

## Phase 1

Phase 1 is implemented as deterministic benchmark scaffolding.

It includes:

- commit harvesting from local git history
- commit eligibility filtering
- stored sparse ticket prompts
- stored task cards
- stored baseline PR markdown
- stored baseline cards
- stored baseline metadata
- benchmark-pack metadata
- judge rubric definition
- deterministic validation

Primary files:

- [aw-history-benchmark-packs.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-history-benchmark-packs.json)
- [aw-revex-history-benchmark.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-revex-history-benchmark.json)
- [aw-revex-history-judge-rubric.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-revex-history-judge-rubric.md)
- [aw-revex-history-benchmark.schema.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/schemas/aw-revex-history-benchmark.schema.json)
- [revex-history-benchmark.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/lib/revex-history-benchmark.js)
- [generate-aw-revex-history-benchmark.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/generate-aw-revex-history-benchmark.js)

## Commit Eligibility

Not every commit is a good reconstruction benchmark.

The generator currently excludes commits when:

- the parent commit is not locally available
- the repo is too shallow for reconstruction
- the commit is docs-only, chore-only, or a revert
- the diff is too large to be a useful benchmark case
- the changed-file count is too large for a focused reconstruction task

This is intentional.
The benchmark is meant to evaluate recoverable real-world work, not giant bootstraps or noisy history.

## Stored Artifacts

Each selected case gets a directory under:

- `tests/evals/fixtures/revex-history/<case-id>/`

Stored files:

- `problem.md`
- `baseline-pr.md`
- `baseline-metadata.json`

The `problem.md` file is now a sparse ticket prompt rather than a generic vague statement.
It includes:

- repo and product context
- affected surface
- change kind
- task statement
- explicit success criteria
- explicit verification expectations

Every fixture case also carries a machine-readable task card with:

- task summary
- task type
- expected surface
- baseline changed files
- success signals
- forbidden scope
- comparison mode
- route expectation

Every fixture case also carries a compact baseline card with:

- baseline title
- commit sha and parent sha
- changed file count
- total lines changed
- changed files

The baseline PR artifact is concise and review-oriented.
Raw patch reconstruction stays on-demand via git commands recorded in metadata.

## Judge Model

The judge compares:

- problem coverage
- correctness
- scope discipline
- verification quality
- PR quality
- risk posture

It may rate the AW candidate as better than the baseline when justified.

Use the rubric in [aw-revex-history-judge-rubric.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-revex-history-judge-rubric.md).

## Phase 2

Phase 2 is the live benchmark loop.

It now runs through the dedicated outcomes harness:

- [aw-revex-history-phase2.test.js](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/outcomes/aw-revex-history-phase2.test.js)

That phase:

1. create a workspace at `commit^`
2. feed only the sparse ticket prompt plus AW context
3. run the smallest correct AW route
4. analyze the candidate with system-level quality gates
5. run one narrow repair pass automatically when the harness detects likely under-reconstruction
6. collect candidate PR output
7. judge candidate vs baseline
8. write a per-case result card with changed-surface comparison metrics
9. append the case run to the long-lived ledger
10. refresh the scoreboard under `tests/results/`

Use it with:

- `bash tests/evals/run-aw-sdlc-evals.sh revex-history`

By default the runner executes a small selected case set.
Use `AW_REVEX_HISTORY_CASE_ID=<case-id>` to run one exact case or `AW_REVEX_HISTORY_MAX_CASES=<n>` to widen the selection.
Use `AW_REVEX_HISTORY_PRESET=smoke` or `bash tests/evals/run-aw-sdlc-evals.sh revex-history-smoke` to run the current cross-domain smoke pair.

## Phase 2 Outputs

Each Phase 2 case now leaves behind:

- `candidate-pr.md`
- `candidate-summary.json`
- `quality-gates.json`
- `result-card.json`
- `judge-output.json`

The result card is the compact answer to “what exactly did we reconstruct?”.
It stores:

- task summary and task type
- expected route and skills
- candidate changed files
- baseline changed files
- surface overlap count
- surface recall rate
- surface precision rate
- missed baseline files
- extra files touched
- score, verdict, strengths, and top gaps

Run history now also persists to:

- [history-benchmark-run-ledger.jsonl](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/results/history-benchmark-run-ledger.jsonl)
- [history-benchmark-scoreboard.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/results/history-benchmark-scoreboard.json)
- [history-benchmark-scoreboard.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/results/history-benchmark-scoreboard.md)

This ledger-plus-scoreboard model is what makes longer-run performance traceable instead of relying on one-off smoke summaries.

## System Quality Gates

Phase 2 now improves the system itself, not only the candidate prompt.

For each case, the harness now writes and uses:

- `case-profile.json` — derived benchmark profile such as likely scope files, locale files, i18n keys, and validation expectation
- `system-validation.txt` — fallback system evidence like `git diff --check` and focused locale excerpts
- `quality-gates.json` — detected gaps plus whether a quality-repair pass was applied

The harness currently checks for gaps such as:

- likely text/copy cases that skipped the scoped locale file
- missing successful validation evidence

When those gaps appear, the harness runs one narrow quality-repair pass before the judge executes.
This keeps the benchmark fair while making it more robust than a single-shot prompt.

## Current Smoke Pair

The current Phase 2 smoke preset intentionally uses one backend case and one frontend case:

- backend: `revex-backend-dce466d4-implement-notification-processing-in-worker-9631`
- frontend: `revex-frontend-557b250b-tax-info-text-fixes-in-payments-page-7863`

This gives the harness a fast structural check across both domains before wider sampling.

## Prompt Heuristics

The candidate prompt now carries a little more task-shaping help for likely text or copy changes.

When the commit clues suggest a copy-focused change, the harness now nudges the model to:

- prefer visible wording and localized strings over framework cleanup
- inspect nearby locale or translation files before deciding the task is component-only
- avoid spending the patch budget on unrelated Vue refactors

This is deliberate.
The Phase 2 goal is not just artifact completion; it is recovering work that stays faithful to the likely shipped intent while staying simple enough to compare PR artifacts reliably.

## Current History Status

The local frontend RevEx repo is still shallow, but it currently exposes enough visible history to generate a 20-case benchmark slice.

That means:

- frontend history is usable for Phase 1 deterministic benchmarking
- the shallow state is still recorded explicitly in the fixture
- deepening the clone is still recommended before Phase 2 if we want stronger confidence in parent availability farther back in history
