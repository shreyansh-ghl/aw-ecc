# AW SDLC Test Plan

## Test Philosophy

Use eval-driven development:

1. Define the target behavior first
2. Write failing evals and tests
3. Improve the workflow until the evals pass
4. Keep the evals as regression protection

This test plan is intentionally broader than the current smoke suite. It validates the full SDLC behavior, not just stage markers.

## Test Layers

### Layer 1: Command Contract Tests

Validate:

- public commands exist
- command status is correct
- aliases and deprecations are intentional
- the public surface stays minimal

Historical failure examples the suite was designed to catch:

- `plan` is still an alias when it should be first-class
- `deploy` does not exist
- `brainstorm` is still exposed as a public stage

### Layer 2: Router Contract Tests

Validate:

- explicit slash commands
- no-command intent routing
- narrow-by-default scope behavior
- end-to-end expansion behavior

Primary failure examples:

- “implement this bug fix” routes into design planning
- “ship to staging” routes to `finish` instead of `deploy`
- “create a PRD” routes to `brainstorm` instead of `plan`

### Layer 3: Hook and Integration Tests

Validate:

- session-start loads the right router instructions
- repo-local and `.aw_registry` layouts both work
- platform docs and `.aw_rules` can be resolved

### Layer 4: Artifact E2E Tests

Validate:

- `plan` creates the right planning artifacts
- `build` creates `execution.md`
- `investigate` creates `investigation.md`
- `test` creates `verification.md` with QA evidence
- `review` creates `verification.md` with readiness and findings
- `deploy` creates `release.md`
- `ship` creates launch and closeout `release.md` evidence
- `state.json` is updated after each stage

### Layer 4A: Real Outcome Workspace Tests

Validate repo-like situations with actual filesystem outcomes:

- `plan` writes `spec.md` and `state.json` in a temp workspace
- `build` writes `execution.md` and `state.json` in a temp workspace
- `review` runs local validation and writes `verification.md`
- `deploy` resolves the configured staging provider and writes `release.md`
- `ship` handles already-reviewed work without recreating unnecessary planning artifacts
- explicit end-to-end automation uses `aw-yolo` rather than overloading `ship`

These are slower than routing evals but provide much stronger confidence because they measure created files and concrete stage outcomes.

For higher reliability, these tests should support:

- one isolated git worktree per case
- optional parallel execution across worktrees
- per-case logs and summaries

### Layer 5: Learning Loop E2E Tests

Validate:

- stage learnings append once per stage
- reruns resume from saved state
- previous learnings influence later runs

### Layer 6: Live CLI Evals

Validate the real user experience on supported CLIs:

- Codex
- Claude
- Cursor where available

These evals should use minimal repo-backed workspaces and natural-language prompts, not only explicit command prompts.

### Layer 7: Customer Behavior Evals

Validate the workflow from the user's point of view:

- what command the system effectively chooses
- what artifacts the user should expect to be created
- what the workflow must not do at that stage
- what the next handoff should be

These are the highest-signal evals for the business KPI of intent-based routing with quality outcomes.

Use two tiers:

- `core` — fast suite for every iteration
- `full` — broader suite before merge or milestone completion

No finite eval set can prove "all possible customer behaviors." The goal is to cover the behavior surface systematically enough that the remaining risk is small and visible.

For customer-behavior coverage, the matrix must span:

- every public command
- every command mode
- every important internal layer
- plain-language intent prompts, not only explicit commands
- stage-boundary protections
- handoff expectations and deterministic artifacts

## Scenario Families

### A. Public Command Scenarios

| Scenario | Expected result |
|---|---|
| `/aw:plan create a PRD` | planning mode only |
| `/aw:build implement approved spec` | build mode only |
| `/aw:investigate diagnose a retry bug` | investigate mode only |
| `/aw:test validate completed work` | test mode only |
| `/aw:review assess staging readiness` | review mode only |
| `/aw:deploy ship verified work` | release mode only |
| `/aw:ship confirm launch readiness` | shipping mode only |

### B. No-Command Intent Scenarios

| Scenario | Expected route |
|---|---|
| “Create a PRD for contact sync” | `plan` |
| “Break this approved design into implementation tasks” | `plan` |
| “Implement the approved worker spec” | `build` |
| “Investigate this worker retry failure” | `investigate` |
| “Test this repaired worker bugfix” | `test` |
| “Review and validate this implementation” | `review` |
| “Ship this to staging” | `deploy` |

### C. Scope-Control Scenarios

| Scenario | Expected protection |
|---|---|
| backend bug fix | no design or PRD artifacts |
| UX concept request | no code execution |
| technical refactor plan | no PRD requirement |
| full end-to-end request | controlled expansion in order |

### D. Artifact Scenarios

| Scenario | Expected files |
|---|---|
| product planning | `prd.md`, `state.json` |
| design planning | `design.md`, `designs/`, `state.json` |
| technical planning | `spec.md`, `state.json` |
| task planning | `tasks.md`, `state.json` |
| build | `execution.md`, updated `state.json` |
| investigate | `investigation.md`, updated `state.json` |
| test | `verification.md`, updated `state.json` |
| review | `verification.md`, updated `state.json` |
| deploy | `release.md`, updated `state.json` |
| ship | `release.md`, updated `state.json` |

### E. Learning Scenarios

| Scenario | Expected result |
|---|---|
| stage succeeds | learning appended |
| stage fails | failure learning appended |
| rerun after partial completion | stage resume from `state.json` |
| repeated failure | prior learning loaded |

### F. Customer Behavior Scenarios

| Scenario | Expected customer-facing behavior |
|---|---|
| “Create a PRD for contact sync” | plan only, create `prd.md`, no code |
| “Implement the approved worker spec” | build only, create `execution.md`, no planning artifacts |
| “Review this PR and tell me if it is ready” | review only, create `verification.md`, no deploy action |
| “Deploy the verified worker to staging” | deploy only, create `release.md`, no new planning |
| “Fix this backend bug” | investigate first, stay narrow, no design/PRD drift |

### F1. Default Session Scenarios

| Scenario | Expected default session behavior |
|---|---|
| fresh session help | surface only `plan`, `build`, `investigate`, `test`, `review`, `deploy`, `ship` |
| technical plan request | route to `plan`, not PRD-first by default |
| worker bugfix request | route to `investigate` when root cause is unclear |
| PR readiness request | route to `review`, include PR governance |
| MFA staging deploy request | route to `deploy`, choose versioned MFA staging provider |
| service staging deploy request | route to `deploy`, choose versioned service staging provider |
| worker staging deploy request | route to `deploy`, choose versioned worker staging provider |
| unknown repo staging deploy request | fail closed via safe fallback |

### G. Coverage Dimensions

| Dimension | Coverage requirement |
|---|---|
| public commands | `plan`, `build`, `investigate`, `test`, `review`, `deploy`, `ship` all represented in `core` |
| command modes | every mode represented at least once in `full` |
| review layers | `code_review`, `local_validation`, `e2e_validation`, `external_validation`, `pr_governance`, `release_readiness` all represented |
| deploy layers | `preflight`, `release_path`, `pipeline_resolution`, `execution`, `post_deploy_evidence`, `learning` all represented |
| default session behavior | minimal public surface, baseline selection, staging-provider selection, and fail-closed fallback all represented |
| stage boundaries | every route has explicit must-not assertions against leakage |
| invocation style | customer-behavior evals stay plain-language and no-command by default |

## Pass Criteria

### Deterministic Tests

- must pass 100%

### Live Intent Routing Evals

- explicit commands: 100%
- no-command routes: at least 90% pass@1
- no-command routes: 100% pass@3

### Scope Safety

- zero protected-scope leaks in the curated eval set

## Execution Order

1. run deterministic contract tests
2. run router integration tests
3. run artifact and learning tests
4. run live Codex evals
5. run live Claude/Cursor evals where supported

### Eval Runner

Use the consolidated runner:

```bash
tests/evals/run-aw-sdlc-evals.sh deterministic
tests/evals/run-aw-sdlc-evals.sh live
tests/evals/run-aw-sdlc-evals.sh live-full
tests/evals/run-aw-sdlc-evals.sh real
tests/evals/run-aw-sdlc-evals.sh real-parallel
tests/evals/run-aw-sdlc-evals.sh all
```

## Historical Red Suite

The original red suite intentionally proved these now-closed gaps:

1. `deploy` was not yet a first-class public command
2. `plan` was not yet a first-class public planning mode
3. no-command intent routing still preferred internal stages over the target public surface
4. artifact and learning contracts were not yet enforced end-to-end
