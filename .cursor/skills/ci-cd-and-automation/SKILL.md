---
name: ci-cd-and-automation
description: Automates quality gates and release pipelines. Use when defining CI checks, deployment automation, preview environments, rollback flows, or pipeline-driven release safety.
origin: ECC
---

# CI/CD and Automation

## Overview

Automation is how engineering standards become real, repeatable gates.
CI/CD should enforce linting, typing, tests, builds, security checks, previews, rollout controls, and rollback readiness so releases do not depend on memory or optimism.

## When to Use

- creating or modifying CI workflows
- adding automated quality gates
- shaping deployment pipelines or preview environments
- debugging pipeline failures
- defining staged rollout and rollback behavior

**When NOT to use**

- the task has no pipeline, release, or automation surface at all

## Workflow

1. Define the gate order from cheapest to most expensive.
   Move checks left where possible:
   lint -> typecheck -> unit/integration tests -> build -> security -> preview or deploy gates.
   Use `../../references/ci-quality-gates.md`.
2. Keep local and CI commands aligned.
   A change should be verifiable the same way locally and in automation.
   Avoid hidden CI-only behavior unless it is truly environment-specific.
3. Feed failures back into engineering loops.
   Treat CI output as concrete evidence for `aw-build` or `aw-investigate`, not as noise.
   Fix the failing gate or make the gap explicit.
4. Automate release safety, not just build success.
   Add preview deployments, staged rollouts, feature flags, smoke checks, and rollback paths where risk justifies them.
5. Handle secrets and environments cleanly.
   Secrets belong in secret stores or CI configuration, not in code or images.
   Environment-specific behavior should be explicit and auditable.
6. Align with org release policy.
   In GHL/ECC repos, respect baseline profiles, staging expectations, status checks, PR governance, and deployment-provider standards through `aw-deploy` and `aw-ship`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We can add the pipeline after the feature works." | Missing automation means standards are optional until too late. |
| "One skipped gate is fine for now." | Temporary gate bypasses tend to become the real process. |
| "The pipeline is flaky, so its failures don't count." | Flake is still a production problem for the release system and should be fixed. |
| "Only production deploys need rollback planning." | Safe staging and preview automation also need explicit recovery paths. |

## Red Flags

- CI and local commands disagree on what "passing" means
- gates are skipped without explicit policy
- preview, staging, or rollback behavior is guessed
- secrets are embedded in code, images, or repo files
- failures are discussed vaguely instead of with the exact pipeline signal

## Verification

After CI/CD work, confirm:

- [ ] the gate order is explicit and sensible
- [ ] local and CI validation paths are aligned where possible
- [ ] release safety includes preview, staging, or rollback logic when needed
- [ ] secrets and environments are handled through approved mechanisms
- [ ] the pipeline outcome is evidence-based and traceable in AW artifacts
