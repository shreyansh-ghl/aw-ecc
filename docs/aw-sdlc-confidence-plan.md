# AW SDLC Confidence Plan

## Goal

This plan defines what must be true before we can say the AW SDLC workflow is trustworthy for day-to-day use.

Confidence does not come from one green smoke test.
It comes from stacked evidence across:

1. deterministic contracts
2. real isolated-workspace outcomes
3. live intent-routing behavior
4. repo-archetype-specific release behavior
5. artifact quality and PR quality checks
6. external integration checks
7. regression stability over repeated runs

## Confidence Ladder

### Level 1: Contract Confidence

Prove that the public interface and command contracts are coherent.

Must prove:

- public commands exist and are active
- command-to-skill mapping is correct
- command quality structure is complete
- checklist and real-eval coverage stay above the target floor

Primary suites:

- deterministic contract tests
- command quality tests
- real coverage tests

Exit bar:

- deterministic suite must pass `100%`

### Level 2: Real Local Outcome Confidence

Prove that commands produce the right artifacts and behavior in isolated repo-like workspaces.

Must prove:

- correct stage chosen
- correct artifacts created
- forbidden artifacts not created
- `state.json` updated
- stage-specific outputs reflect the request
- artifact quality is strong enough for the next stage to proceed without guessing

Primary suite:

- `real-parallel`

Current target matrix:

1. `plan-technical-spec`
2. `plan-tasks-from-spec`
3. `execute-approved-spec`
4. `execute-docs-only`
5. `verify-pr-governance`
6. `verify-failing-change-requires-repair-loop`
7. `deploy-microservice-staging`
8. `deploy-microfrontend-staging`
9. `deploy-worker-staging`
10. `ship-unverified-to-staging`
11. `ship-verified-to-staging`

Exit bar:

- all 11 real cases pass
- suite must pass in isolated temp workspaces
- suite should also pass in isolated git-worktree mode

### Level 3: Artifact Quality Confidence

Prove that every artifact is not only present, but good.

Must prove:

- planning artifacts are concrete and testable
- execution artifacts explain exactly what changed
- verification artifacts contain real evidence, not inferred claims
- release artifacts contain the exact outcome, provider, versioned path, or blocker
- release artifacts contain versioned links, build links, testing automation links, and build status
- artifacts are strong enough to hand off to another engineer without extra hidden context

Primary checks:

- checklist review against `aw-sdlc-real-eval-checklist.md`
- real artifact content assertions
- human spot-check on representative cases

Exit bar:

- no artifact-quality checklist item is knowingly unmet
- no stage artifact requires guesswork to continue

### Level 4: Intent Confidence

Prove that users do not need explicit slash commands.

Must prove:

- plain-language prompts route to the right public stage
- scope stays narrow when the request is narrow
- full-flow requests expand in the right order
- stage boundaries are respected

Primary suites:

- live routing evals
- customer behavior evals

Exit bar:

- explicit command routing: `100%`
- core intent routing: `>= 90% pass@1`
- core intent routing: `100% pass@3`
- zero known stage-leak failures in the curated eval set

### Level 5: Repo Archetype Confidence

Prove that deployment behavior changes correctly by GHL repo type.

Must prove:

- microfrontend staging resolves the MFA provider
- microservice staging resolves the service provider
- worker staging resolves the worker provider
- unknown repos fail closed

Primary suites:

- default session coverage
- GHL staging baseline tests
- real deploy cases for all three archetypes

Exit bar:

- all archetype resolution tests pass
- all staging provider checks pass
- unknown repo path remains fail-closed

### Level 6: External Integration Confidence

Prove that the system works against real external systems, not only synthetic temp repos.

Must prove:

- real git context is recognized
- PR creation succeeds in a real repo with a remote
- PR description quality and production-readiness are checked in the real repo
- GitHub checks or CI statuses are read when the target repo has them
- testing artifacts produced by the real pipeline are recorded
- staging deployment can be dry-run or executed in a real configured repo
- staging deployment uses the correct versioned path for the repo archetype
- release artifact records versioned links, build links, testing automation links, and build status
- release artifacts record real references, not only simulated blockers

Required live checks:

1. one real PR creation flow in a repo with a valid remote
2. one real PR readiness check that confirms the PR is production-ready
3. one real staging dry-run or trigger in a configured microservice repo
4. one real staging dry-run or trigger in a configured microfrontend repo
5. one real staging dry-run or trigger in a configured worker repo
6. one real GitHub or CI status read in a repo that actually has workflows

Exit bar:

- at least one live PR flow succeeds
- at least one live PR-quality / production-readiness check succeeds
- at least one live staging flow succeeds per repo archetype or has a trusted dry-run equivalent
- when a repo has GitHub workflows, the workflow/testing evidence is captured

Note:

- `aw-ecc` itself does not currently contain a `.github/` workflow directory, so GitHub workflow and pipeline-integration checks must be validated against real target repos, not only the engine repo.

### Level 7: Stability Confidence

Prove that green results are repeatable and not lucky one-offs.

Must prove:

- deterministic runs stay green repeatedly
- real suite stays green across consecutive runs
- live routing does not regress after command or skill changes

Recommended metric:

- deterministic: pass^3
- real suite: pass^2 minimum, pass^3 preferred
- live routing core: pass@3 `100%`

## Release Gates

### Gate A: Local Development Gate

Run on every meaningful SDLC change:

```bash
bash tests/evals/run-aw-sdlc-evals.sh deterministic
```

Required result:

- `100%` pass

### Gate B: Pre-Merge Confidence Gate

Run before merging SDLC command or skill changes:

```bash
AW_SDLC_EVAL_REF=WORKTREE AW_SDLC_EVAL_WORKSPACE_MODE=tempdir AW_SDLC_EVAL_PARALLELISM=2 bash tests/evals/run-aw-sdlc-real-parallel.sh
bash tests/evals/run-aw-sdlc-evals.sh live
```

Required result:

- all 10 real examples pass
- live routing core is green
- artifact-quality checklist is still satisfied

### Gate C: Pre-Rollout Confidence Gate

Run before declaring the workflow production-ready:

```bash
bash tests/evals/run-aw-sdlc-evals.sh live-full
AW_SDLC_EVAL_REF=WORKTREE AW_SDLC_EVAL_WORKSPACE_MODE=git-worktree AW_SDLC_EVAL_PARALLELISM=2 bash tests/evals/run-aw-sdlc-real-parallel.sh
```

Plus:

- live PR creation in a real repo
- live PR-quality / production-readiness check in a real repo
- live GitHub or CI status evidence in a repo with workflows
- live staging dry-run or trigger in configured repos
- versioned staging deployment evidence in configured repos

Required result:

- all curated live suites green
- all real suites green
- live external integration checks complete

## Human Checklist

Before saying “this is ready”, confirm:

1. Commands and skills agree on the same artifact model.
2. Intent routing works without slash commands for the core flows.
3. The 10-example real suite passes.
4. The full `ship` flow passes.
5. Staging provider resolution works for MFA, service, and worker repos.
6. Unknown repo deploys fail closed.
7. PR checklist verification is enforced in `verify`.
8. Unit, type-check, lint, and build evidence appear in verification artifacts when available.
9. Artifact quality is high across `spec.md`, `tasks.md`, `execution.md`, `verification.md`, and `release.md`.
10. PR quality is high enough that the PR looks production-ready, not merely created.
11. Testing artifacts are captured when the target repo or pipeline produces them.
12. Release artifacts clearly record outcomes, versioned staging details, or blockers.
13. At least one live PR flow and one live staging flow have been tested against real external systems.
14. If the target repo has GitHub workflows, those workflow or status results are captured and checked.

## What “Good” Looks Like

We can say the system looks good when:

- deterministic suite is green
- real 10-case suite is green
- live routing core is green
- full ship flow is green
- archetype staging resolution is green
- artifact quality is consistently high
- PR quality and release quality are judged explicitly
- at least one real external integration path has been validated

Until the live external integration layer is green, we should call the system:

- locally reliable
- artifact reliable
- routing reliable

but not fully production-proven.
