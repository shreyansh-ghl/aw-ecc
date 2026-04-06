# AW SDLC End-to-End Plan

## Goal

Make the AW SDLC workflow feel minimal to developers while remaining reliable, testable, and grounded in platform knowledge.

The target user experience is:

- developers can use a very small public interface
- developers can also write normal intent-based requests without commands
- commands, skills, artifacts, platform docs, and the learning loop work as one system
- every stage produces deterministic artifacts and can be validated automatically

## Why This Exists

This plan began while the AW SDLC migration was still in progress.
These were the historical gaps it set out to close:

| Current branch state | Problem |
|---|---|
| legacy `execute`, `verify`, and `finish` aliases still exist | Compatibility paths can confuse the canonical mental model if docs are stale |
| `plan` previously routed through internal discovery too often | planning needed to become a first-class public mode |
| `finish` mixed merge/deploy handoff concerns | `deploy` and `ship` needed clearer ownership |
| testing and review were historically overloaded | they needed to be separated clearly as `test` and `review` |
| smoke tests validated stage routing only | artifacts, intent routing, learning, and platform-doc grounding still needed coverage |

## Product Goals

1. Provide a minimal public interface for developers.
2. Make the public interface work consistently with the underlying skills.
3. Define deterministic artifacts for every command.
4. Support both slash-command invocation and no-command intent routing.
5. Load relevant platform docs and `.aw_rules` automatically.
6. Extend the learning loop so each run improves future runs.
7. Ship with automated evidence, not prompt-only confidence.

## Non-Goals

- Build a brand-new registry runtime in this PR.
- Support every possible team-specific workflow name publicly.
- Replace the full ECC engine inside `aw-ecc`.
- Force product or design artifacts for engineering-only tasks.

## Target Public Interface

Keep the public interface to the real lifecycle stages:

| Public command | User meaning | Internal stages |
|---|---|---|
| `/aw:plan` | Decide what and how to build | planning stages only |
| `/aw:build` | Build the approved work | implementation only |
| `/aw:investigate` | Diagnose unclear bugs and alerts | investigation only |
| `/aw:test` | Produce fresh QA evidence | testing only |
| `/aw:review` | Validate findings, governance, and readiness | review + evidence gathering |
| `/aw:deploy` | Execute the release action | release stage |
| `/aw:ship` | Confirm launch safety and closeout | shipping stage |

Notes:

- `brainstorm` stays internal unless we intentionally expose it later.
- compatibility aliases can remain temporarily, but they should not be the primary UX.
- `aw-yolo` stays internal for explicit end-to-end automation.

## Target Internal Stage Model

The internal workflow remains richer than the public interface:

1. Discover intent
2. Plan
3. Build
4. Investigate when needed
5. Test
6. Review
7. Deploy
8. Ship
9. Learn

The public command picks the entrypoint. The system should not automatically run all later stages unless the user clearly asked for end-to-end execution.

## Command Contract

Every command should define the same contract fields:

| Field | Meaning |
|---|---|
| `mode` | `plan`, `build`, `investigate`, `test`, `review`, `deploy`, or `ship` |
| `output_artifacts` | The artifact(s) this run must create or update |
| `input_artifacts` | Artifacts that may be used if already present |
| `missing_prerequisites` | Inputs required before the run can continue |
| `must_not_require` | Artifacts from other modes that should not be forced |
| `next_recommended_mode` | The next stage if the user wants to continue |

## Artifact System

Use one deterministic feature folder:

```text
.aw_docs/features/<feature_slug>/
  prd.md
  design.md
  designs/
    manifest.json
    <route_slug>/
      manifest.md
      prototype.html
      desktop-default.png
      mobile-default.png
  spec.md
  tasks.md
  execution.md
  verification.md
  release.md
  state.json
```

### Artifact Rules

| Command | Required output | Optional outputs | Must not force |
|---|---|---|---|
| `plan` | `state.json` plus the planning artifact(s) needed for the active mode | `prd.md`, `design.md`, `designs/`, `spec.md`, `tasks.md` | unrelated upstream artifacts |
| `build` | `execution.md` plus implementation changes | updated `state.json` | `prd.md` if product mode is not active |
| `investigate` | `investigation.md` plus root-cause evidence | updated `state.json` | implementation changes unless explicitly approved |
| `test` | `verification.md` plus fresh QA evidence | updated `state.json` | deploy artifacts |
| `review` | `verification.md` plus readiness outcome | updated `state.json` | implementation work |
| `deploy` | `release.md` | updated `state.json` | product or design artifacts |
| `ship` | `release.md` plus launch and rollback notes | updated `state.json` | implementation work |

### Planning Artifact Rules

Planning should create only the artifacts that are needed:

| Situation | `plan` should produce |
|---|---|
| Product definition work | `prd.md` |
| Design work | `design.md` and `designs/` |
| Technical design work | `spec.md` |
| Execution breakdown | `tasks.md` |
| End-to-end planning | missing artifacts in the order `prd -> design -> spec -> tasks` |

## Intent Routing Rules

### Core Routing

| User request pattern | Route |
|---|---|
| define, scope, research, spec, architecture, break down | `plan` |
| build, implement approved work, change, continue coding | `build` |
| investigate unclear bugs, regressions, or alerts | `investigate` |
| test, validate, QA, prove a fix, run checks | `test` |
| review, ready, findings, governance, staging readiness | `review` |
| ship, release, merge, deploy, stage to production | `deploy` |

### Routing Precedence

1. Explicit slash command wins.
2. If there is no slash command, classify the natural-language request.
3. Default to a single stage.
4. Expand to multiple stages only when the user clearly asked for end-to-end work.

### Scope Guardrails

- A code-only request must not wander into design or PRD by default.
- A design request must not wander into code by default.
- Expansion is allowed only when:
  - the user explicitly asked for multiple artifacts or end-to-end work
  - a blocking prerequisite is missing and must be created to produce a valid output

## Platform Docs and Rules Contract

For every run:

1. Load the applicable command contract.
2. Load the session router instructions.
3. Load relevant `.aw_rules`.
4. Load matching platform docs and platform skills for the touched domain.
5. Record which sources were used in `state.json`.

This keeps `platform-docs` as the source of truth for domain behavior while `aw-ecc` remains the execution engine.

## Learning Loop Contract

The workflow should learn at two levels:

| Level | Storage | Purpose |
|---|---|---|
| Feature run state | `.aw_docs/features/<feature_slug>/state.json` | deterministic resume and stage awareness |
| Durable learnings | `.aw_docs/learnings/<agent-or-mode>.md` | reusable lessons across runs |

Each stage should append:

- what worked
- what failed
- which rule or doc mattered
- what future routing should do differently

The learning loop is complete only if:

1. a stage result is written
2. a learning is captured
3. the next run can resume without re-guessing state

## Automated Test Strategy

We need four layers of proof.

### 1. Static Contract Validation

Validate:

- command frontmatter
- alias and replacement metadata
- command-to-command references
- command-to-skill references
- artifact contract schema

Current base:

- `scripts/ci/validate-commands.js`
- `tests/ci/command-alias-validation.test.js`
- `tests/lib/command-frontmatter.test.js`

### 2. Router and Hook Integration Tests

Validate:

- session-start loads the router correctly
- repo-local and `.aw_registry` layouts both work
- intent phrases map to the expected stage
- no-command requests choose the correct mode

Current base:

- `tests/integration/aw-session-start.test.js`

### 3. Real CLI Smoke Tests

Validate real harness behavior across supported CLIs:

- explicit `/aw:plan`
- explicit `/aw:build`
- explicit `/aw:investigate`
- explicit `/aw:test`
- explicit `/aw:review`
- explicit `/aw:deploy`
- explicit `/aw:ship`
- natural language that should route to each stage
- compatibility aliases during migration

Current base:

- `scripts/lib/real-cli-smoke.js`
- `tests/lib/real-cli-smoke.test.js`

### 4. Artifact and Learning E2E Tests

Validate:

- planning creates deterministic files under `.aw_docs/features/<feature_slug>/`
- execution updates `execution.md` and `state.json`
- verification writes `verification.md`
- deploy writes `release.md`
- learning files are appended once per stage
- reruns resume from `state.json` instead of redoing earlier stages

This layer is still missing and should be added next.

## Scenario Matrix

### Explicit Command Scenarios

| Scenario | Expected result |
|---|---|
| `/aw:plan` for a greenfield feature | enters planning mode and writes planning artifacts only |
| `/aw:build` with approved `spec.md` and `tasks.md` | builds without re-entering planning |
| `/aw:investigate` for an unclear bug | produces reproduction and fault-surface evidence |
| `/aw:test` after implementation | produces fresh QA evidence |
| `/aw:review` after testing | produces findings and readiness output |
| `/aw:deploy` after review | produces release output only |
| `/aw:ship` after deploy | produces launch-readiness and closeout output |

### Intent-Only Scenarios

| Prompt | Expected route |
|---|---|
| "Create a PRD for contact sync" | `plan` |
| "Plan the implementation for this worker" | `plan` |
| "Implement the approved worker plan" | `build` |
| "Investigate this retry failure" | `investigate` |
| "Test this repaired bugfix" | `test` |
| "Review and validate this completed work" | `review` |
| "Ship this to staging" | `deploy` |

### Scope Control Scenarios

| Scenario | Expected protection |
|---|---|
| "Fix this backend bug" | does not create design artifacts |
| "Create UX for onboarding" | does not start coding |
| "Take this from PRD to ship" | expands across stages in order |
| "Plan this refactor from the approved design" | creates `spec.md` or `tasks.md`, not `prd.md` |

### Learning Scenarios

| Scenario | Expected result |
|---|---|
| stage completes successfully | learning appended once |
| rerun after partial progress | resumes from `state.json` |
| same failure repeats | prior learning is loaded and referenced |

## Gap Between Current Branch and Target

| Area | Historical branch state | Target |
|---|---|---|
| Public planning entrypoint | `plan` over-relied on `brainstorm` | `plan` is a first-class public mode |
| Release command | `finish` | `deploy` plus `ship` |
| Test vs review | merged implicitly | separated and documented |
| Artifact model | planning-focused only | artifacts for every command |
| Intent router | keyword-first | mode + artifact + scope aware |
| Learning loop | partially implied | explicit and testable |
| Smoke suite | stage markers | stage markers plus intent, artifacts, and learning coverage |

## Execution Plan

### Phase 1: Lock the Interface

- finalize the public commands
- keep `finish` deprecated and preserve only compatibility aliases that still help migration
- document `execute` and `verify` as compatibility shims only

### Phase 2: Lock the Artifact Contract

- finalize the feature folder layout
- define required outputs for `plan`, `build`, `investigate`, `test`, `review`, `deploy`, and `ship`
- add contract tests

### Phase 3: Lock Intent Routing

- add explicit routing rules for no-command prompts
- add scope guardrails
- add integration tests for intent-only routing

### Phase 4: Lock Learning and Resume

- define learning append rules
- persist stage state in `state.json`
- test partial-run resume

### Phase 5: Lock Real CLI Evidence

- extend smoke tests across `plan/build/investigate/test/review/deploy/ship`
- add no-command smoke prompts
- run the suite on Codex, Claude, and Cursor where available

## Definition of Done

This effort is done when:

1. the public interface is documented and stable
2. every command has a deterministic artifact contract
3. no-command intent routing is covered by automated tests
4. the workflow loads platform docs and rules by domain
5. the learning loop writes durable state and learnings
6. real CLI smoke tests pass for the supported stages
7. the team can point to one document and one test suite as the source of truth
