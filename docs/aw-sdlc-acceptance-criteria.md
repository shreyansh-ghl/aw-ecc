# AW SDLC Acceptance Criteria

## Business KPIs

The two most important business KPIs are:

1. Quality outcome
2. Intent-based routing without requiring commands

Everything else exists to support those two outcomes.

## KPI 1: Quality Outcome

### Definition

The workflow should consistently produce correct, high-signal outputs with the right artifacts, the right validation, and the right handoff.

### Acceptance Criteria

| ID | Acceptance criterion | Evidence |
|---|---|---|
| Q1 | Every public stage has a deterministic artifact contract | contract tests + artifact E2E tests |
| Q2 | Engineering-only requests do not force product or design artifacts | intent routing evals + artifact assertions |
| Q3 | `verify` produces evidence-based readiness output, not only generic review prose | live CLI routing evals + verification artifact checks |
| Q4 | Platform docs and `.aw_rules` are loaded for the touched domain | integration tests + `state.json` source tracking |
| Q5 | The workflow persists resumable state and stage learnings | learning-loop E2E tests |
| Q6 | Green-path flows pass on the supported live CLIs | live smoke/eval suite |

### Exit Threshold

- 100% pass on deterministic contract tests
- 100% pass on artifact and learning persistence tests
- 100% pass on core green-path CLI stage flows
- 0 critical mismatches between requested scope and generated artifacts

## KPI 2: Intent-Based Routing

### Definition

A developer should be able to describe the work in plain language and be routed to the correct stage without needing to remember commands.

### Acceptance Criteria

| ID | Acceptance criterion | Evidence |
|---|---|---|
| R1 | Explicit slash commands always route to the requested public stage | command routing evals |
| R2 | No-command natural-language prompts route to the same stage a trained user would choose | intent routing evals |
| R3 | The public surface is minimal: `plan`, `execute`, `verify`, `deploy` | command contract tests |
| R4 | Internal-only stages such as `brainstorm` are not required in the public UX | command status tests |
| R5 | Scope stays narrow by default | scope-control evals |
| R6 | End-to-end requests can intentionally expand across stages | linked/full-flow evals |
| R7 | Customer-behavior coverage spans every public mode and key stage boundary | customer coverage matrix tests |

### Exit Threshold

- 100% pass on explicit command routing cases
- at least 90% pass@1 on curated no-command routing cases per supported CLI
- 100% pass@3 on curated no-command routing cases per supported CLI
- 0 unacceptable scope leaks in the protected scenarios
- full customer-behavior matrix covers every public mode and key layer family

## Goal-to-Test Mapping

| Goal | Primary test layer |
|---|---|
| Minimal developer interface | command contract evals |
| Commands and skills work together | hook + routing integration tests |
| Deterministic artifacts | artifact contract + file-system E2E tests |
| Coverage for every command | per-command scenario suites |
| Intent-based behavior | live routing evals |
| Learning loop | resume + learning persistence tests |

## Release Gate

The SDLC workflow is ready only when:

1. both business KPIs meet their thresholds
2. the live Codex eval suite passes the core scenarios
3. the deterministic artifact and learning tests pass
4. the router behaves correctly both with and without slash commands
