# AW SDLC BDD Workflows

This document starts a BDD layer for the AW SDLC workflow in `aw-ecc`.

The goal is not to replace the existing eval harness. The goal is to add a
human-readable behavior layer that product, engineering, and QA can review
without reading implementation-heavy test files.

## Why add BDD here

The current test stack is strong on:

- deterministic command and contract checks
- real-outcome workspace tests
- live routing and behavior evals

What it lacks is a compact, business-readable source of truth for workflow
behavior. BDD fills that gap.

## What this first version includes

- Gherkin-style workflow scenarios in:
  - `tests/bdd/features/aw-sdlc-workflows.feature`
- deterministic coverage validation in:
  - `tests/evals/aw-sdlc-bdd-coverage.test.js`
- one-to-one mapping from each BDD scenario to an existing real outcome case

This gives us a clean stack:

- BDD feature file:
  - human-readable workflow intent and outcomes
- real outcome case:
  - executable workspace test with real files on disk
- checklist and coverage tests:
  - guardrails that keep the workflow honest over time

## Authoring rules

Every workflow scenario should:

- be intent-first
- avoid slash commands in the `When` step
- include `Given`, `When`, and `Then`
- have `# case-id: <real-case-id>` metadata
- map to exactly one executable real-outcome case

## Current workflow coverage

The initial feature file covers the 10 real workflow examples:

- technical planning from an approved contract
- task planning from an approved spec
- approved implementation execution
- docs-only execution
- PR verification and governance
- microservice staging deployment
- microfrontend staging deployment
- worker staging deployment
- verified ship flow
- full PR-plus-staging ship flow

## Next step after this baseline

Once this layer is stable, the next upgrade is:

1. parse feature files directly into runnable case selection
2. support scenario tags for archetypes like `@microservice`, `@mfa`, `@worker`
3. add Communities-specific feature files
4. add true external BDD scenarios for live PR creation and staging links
