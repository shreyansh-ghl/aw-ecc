# AW SDLC Eval Layout

This suite is organized by execution mode instead of one flat directory:

- `deterministic/` — snapshot and contract tests that should run locally without live external side effects
- `live/` — CLI behavior tests that exercise live routing and customer-facing resolution
- `real/` — end-to-end and release-artifact tests that materialize real workspaces or validate live release evidence
- `fixtures/` — shared prompt and case data
- `lib/` — shared helpers for snapshots, eval workspaces, baseline parsing, and release generation

Runner scripts remain at the `tests/evals/` root:

- `run-aw-sdlc-evals.sh`
- `run-aw-sdlc-real-parallel.sh`
- `run-aw-sdlc-live-golden-path.sh`
- `run-aw-sdlc-ghl-ai-standalone-smoke.sh`

When adding a new test, place it in the narrowest mode bucket possible and keep shared data in `fixtures/` or `lib/` rather than duplicating helpers across suites.
