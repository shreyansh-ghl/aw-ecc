# AW SDLC Superpowers Parity Plan

This plan is about reaching capability parity with Superpowers without giving up the AW SDLC contract model.

## Invariants

- keep the public surface small: `/aw:plan`, `/aw:execute`, `/aw:verify`, `/aw:deploy`, `/aw:ship`
- keep deterministic artifacts under `.aw_docs/features/<slug>/`
- keep `verify` and `deploy` as separate stages
- keep GHL-specific baselines and fail-closed deploy behavior
- keep `brainstorm`, `finish`, `code-review`, and `tdd` as internal or compatibility helpers

## Phase 1: Truthful Foundations

Goal: make the current runtime and eval story honest before adding more orchestration.

- make the session-start hook prefer repo-local AW routing content before any external `.aw_registry` fallback
- keep external registry discovery available so domain skills still show up when present
- remove machine-specific absolute paths from AW SDLC evals
- make `git-worktree` eval mode materialize the requested ref instead of always leaking `HEAD`
- align contradictory real-outcome assertions with the helper-based contract
- stop blessing legacy router behavior as an expected success case

## Phase 2: Hidden Preparation Layer

Goal: absorb Superpowers-style setup behavior without expanding the public command surface.

- add an internal preparation step used by `/aw:execute` and `/aw:ship`
- verify branch or worktree isolation before risky work
- detect dirty repo state and missing prerequisites early
- record setup evidence in deterministic artifacts
- status: started

## Phase 3: Stronger Execute Orchestrator

Goal: make `/aw:execute` behave like a real task runner, not just a thin prompt.

- split `tasks.md` into execution units
- support task-by-task context packaging
- run a spec-compliance pass before a task can be marked complete
- run a code-quality or reliability review pass after compliance
- support controlled parallel workers for independent tasks
- status: started

## Phase 4: Review and Repair Loops

Goal: match the practical execution discipline that makes Superpowers feel complete.

- add a first-class findings-to-fix-to-re-review loop inside `verify`
- harden TDD as execution policy instead of a public command
- add a systematic debugging path for bug-fix execution
- make release evidence distinguish simulated, blocked, and real external actions
- status: started

## Phase 5: Productization

Goal: make AW SDLC portable and installable across environments.

- publish install guidance for the supported harnesses
- convert cross-repo assumptions into optional integration inputs
- add disposable smoke coverage for real routing and release flows
- document the capability map: what AW SDLC owns vs what the harness owns
- status: started

## Acceptance Bar

Parity is not "copy every Superpowers command."

Parity means:

- the repo-local runtime actually routes to the AW SDLC surface
- hidden internals provide worktree setup, orchestration, review loops, and stronger execution discipline
- evals are portable and can prove behavior outside one workstation
- the public AW SDLC contract remains cleaner than the larger workflow vocabulary it borrows from

## Active Parallel Tracks

- hidden preparation layer under `aw-prepare`
- stronger `/aw:execute` orchestration
- findings -> fix -> re-review loop inside `/aw:verify`
- installability and productization hardening
