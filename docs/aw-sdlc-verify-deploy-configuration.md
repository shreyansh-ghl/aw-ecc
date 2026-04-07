# AW SDLC Verify and Deploy Configuration

## Purpose

Make the shared QA/review/deploy configuration:

- consistent across GHL
- configurable per repo or app
- decoupled from hardcoded commands, pipelines, and file paths
- concrete enough to match how GHL actually reviews, tests, and deploys to staging today

This document focuses on the current GHL rollout scope:

- strong testing and review
- PR checklist enforcement
- versioned staging deployment

It does not try to solve every future production path yet.

## The Key Design

There are two things that must stay separate:

1. the **engine contract**
2. the **repo-specific configuration**

The engine contract is fixed.
The repo-specific configuration is variable.

So:

- ECC owns the stages, layers, and output contracts
- GHL repos supply the commands, test runners, test repos, PR checklist rules, and staging pipelines

## Transition Note

The public AW interface now uses:

- `/aw:plan`
- `/aw:build`
- `/aw:investigate`
- `/aw:test`
- `/aw:review`
- `/aw:deploy`
- `/aw:ship`

The configuration model in this document still uses a shared `verify` baseline shape because the same baseline data now feeds:

- `aw-test`
- `aw-review`
- legacy `aw-verify`
- `aw-deploy`
- `aw-ship`

That means the config remains stable while the public command model becomes clearer.

## 1. Fixed Public Commands

The public interface stays:

- `/aw:plan`
- `/aw:build`
- `/aw:investigate`
- `/aw:test`
- `/aw:review`
- `/aw:deploy`
- `/aw:ship`

The shared verification baseline still feeds testing, review, readiness, and deploy safety.

## 2. Fixed Verification Baseline

The shared verification baseline should always run the same six conceptual layers, in the same order.

### Verify Layers

| Layer | What it owns | Typical examples |
|---|---|---|
| `code_review` | specialist review and standards compliance | architecture, security, reliability, maintainability, design review |
| `local_validation` | repo-local automated evidence | unit tests, integration tests, lint, typecheck, build |
| `e2e_validation` | end-to-end coverage | Playwright/Cypress in same repo or separate test repo |
| `external_validation` | out-of-repo or pipeline-based validation | sandbox runs, external app checks, downstream smoke tests |
| `pr_governance` | PR checklist, quality gates, and approval readiness | PR description present, checklist complete, verification items checked, approvals, required statuses |
| `release_readiness` | staging readiness decision | rollback plan, migration safety, versioned deploy recommendation |

These six layers are fixed.
What changes per repo is how each layer is fulfilled.

In the updated public model:

- `aw-test` primarily owns `local_validation`, `e2e_validation`, and `external_validation`
- `aw-review` primarily owns `code_review`, `pr_governance`, and `release_readiness`
- legacy `aw-verify` may still compose both

### Local Validation Minimum

For the current GHL baselines, `local_validation` should require at least:

- unit tests
- lint
- typecheck
- build

Integration tests should run whenever the repo has them, and they should still belong to `local_validation`.

### PR Governance Minimum

For the current GHL baselines, `pr_governance` should check at least:

- PR description exists
- PR description checklist is complete
- the PR explicitly says what was verified
- required status checks are green
- required approvals are present
- quality gates are green

## 3. Fixed Deploy Contract

`/aw:deploy` should always run the same six conceptual layers.

For the current GHL rollout, these deploy layers should only be concretely configured for:

- `pr`
- `branch`
- `staging`

Production can remain disabled in the baseline profiles until the staging path is proven end to end.

### Deploy Layers

| Layer | What it owns | Typical examples |
|---|---|---|
| `preflight` | test/review approval preconditions | test and review passed, required approvals present |
| `release_path` | select the deployment mode | PR, branch, staging |
| `pipeline_resolution` | resolve the `ghl-ai` transport and the concrete GHL release mechanism | `ghl-ai` -> versioned MFA staging, `ghl-ai` -> versioned service staging, `ghl-ai` -> versioned worker staging |
| `execution` | perform the selected release action | call `ghl-ai`, create PR, push branch |
| `post_deploy_evidence` | capture proof the action succeeded | build URL, deployment URL, workload reference, health check |
| `learning` | save outcome and operational learning | release note, failure note, retry note |

These six layers are also fixed.

## 4. What Is Configurable

Per repo or app, configuration should decide:

- which review playbooks to run
- which local test commands to run
- whether E2E is in this repo or another repo
- which external validations are required
- what PR checklist items and statuses count as ready
- what versioned staging pipeline exists
- which external deployment transport executes staging, normally `ghl-ai`
- how version deployment works for that repo archetype

That means the command contract stays stable, but the implementation stays adaptable.

## 5. Recommended Config Files

For humans, use one repo-local file:

```text
.aw_sdlc/
  profile.yml
```

That file is repo-owned configuration, not platform-owned source-of-truth docs.

It should select a baseline and override only the repo-specific differences.

The canonical baseline catalog should live in `platform-docs` at:

```text
platform-docs/.aw_registry/platform/core/defaults/aw-sdlc/
  README.md
  profiles.yml
```

`aw-ecc` may also ship a synced runtime snapshot at:

```text
defaults/aw-sdlc/
  baseline-profiles.yml
```

Resolution order should be:

1. repo-local profile override
2. detected GHL baseline profile by repo archetype
3. GHL safe fallback profile
4. fail closed for actions the fallback does not allow

## 5A. Baseline Profile Family

Instead of one weak generic default, use a small baseline family that covers most GHL repos:

| Baseline | Use for | Why |
|---|---|---|
| `ghl-microfrontend-standard` | MFA, shell-driven frontend, iframe/independent frontend apps | covers frontend review, unit validation, E2E, PR checklist checks, and versioned MFA staging |
| `ghl-microservice-standard` | backend APIs and service repos | covers strong code review, unit/integration validation, PR governance, and versioned service staging |
| `ghl-worker-standard` | queue/pubsub/background worker repos | covers worker-focused readiness, PR governance, and versioned worker staging |
| `ghl-safe-fallback` | unknown or unclassified repos | safe minimum with PR/branch only |

These are not "ECC defaults." They are **GHL baseline operating profiles** whose canonical source belongs in `platform-docs`.

## 5B. Baseline Selection

Recommended resolver behavior:

1. If `.aw_sdlc/profile.yml` exists, use it.
2. Else, detect repo archetype:
   - `microfrontend`
   - `microservice`
   - `worker`
3. Load the matching GHL baseline profile.
4. If detection is ambiguous, use `ghl-safe-fallback`.

### Suggested Detection Heuristics

| Archetype | Signals |
|---|---|
| `microfrontend` | frontend repo naming, Highrise/Vue dependencies, MFA Jenkins/versioned deploy setup, `remoteEntry.js` or module-federation config |
| `microservice` | server deployment values, service Jenkins pipelines, NestJS/service layout, health endpoints |
| `worker` | worker deployment values, worker naming, Pub/Sub/base worker patterns, no primary HTTP app |

## 6. Repo Profile Schema

The repo should not have to manage separate per-entity config files.

Use one file like this:

```yaml
version: 1
extends: ghl-microservice-standard

verify:
  local_validation:
    command_groups:
      - unit
      - integration
      - lint
      - typecheck
      - build
    required_minimums:
      - unit
      - lint
      - typecheck
      - build
  e2e_validation:
    enabled: true
    provider: test-repo
    repo_hint: ai-marketplace-tests
  pr_governance:
    checks:
      - pr_description_present
      - pr_description_checklist_complete
      - pr_verification_items_checked
      - required_status_checks_green
      - required_approvals_present
      - quality_gates_green

deploy:
  staging:
    pipeline: staging-versions/job/team/job/contact-sync-worker
```

So:

- the repo edits one file
- the engine resolves one baseline
- the engine merges the overrides

## 7. Internal Engine Shape

Inside ECC, it is still okay to keep an internal runtime snapshot or manifest.

That split is for:

- deterministic lookup
- easier testing
- simpler resolver logic

But that is an implementation detail.

The repo author should experience this as:

- one repo profile
- one chosen baseline
- a few overrides

## 8. Expanded Profile Shape

Example:

```yaml
version: 1
extends: ghl-microservice-standard

verify:
  code_review:
    playbooks:
      - platform-review:code-review-pr
      - platform-review:security-review
      - platform-review:reliability-review
  local_validation:
    command_groups:
      - unit
      - integration
      - lint
      - typecheck
      - build
    commands:
      unit:
        - pnpm test:unit
      integration:
        - pnpm test:integration
      lint:
        - pnpm lint
      typecheck:
        - pnpm typecheck
      build:
        - pnpm build
    required_minimums:
      - unit
      - lint
      - typecheck
      - build
  e2e_validation:
    enabled: true
    provider: test-repo
    repo_hint: ai-marketplace-tests
    playbooks:
      - platform-sdet:test-repos-guide
    required_for:
      - staging
  pr_governance:
    checks:
      - pr_description_present
      - pr_description_checklist_complete
      - pr_verification_items_checked
      - required_status_checks_green
      - required_approvals_present
      - quality_gates_green
  release_readiness:
    checks:
      - rollback_plan_present
      - migration_safety_confirmed
      - staging_smoke_recommended
      - release_recommendation
```

## 9. Deploy Overrides

Example:

```yaml
version: 1
extends: ghl-worker-standard

deploy:
  pr:
    provider: github-pr
  branch:
    provider: git-push
  staging:
    provider: ghl-ai
    execution_backend: git-jenkins
    mechanism: versioned-worker-staging
    pipeline: staging-versions/job/team/job/contact-sync-worker
    strategy: versioned-worker
  versioning:
    type: developer-version
    source: branch-or-build-id
    routing_signal: developer_version
  post_deploy_checks:
    - pipeline_succeeded
    - worker_pod_healthy
    - subscription_consumption_ok
  guards:
    require_verify_status:
      - PASS
      - PASS_WITH_NOTES
```

## 10. How The Engine Uses These Profiles

### Verify Flow

When the user says:

`Review this PR and tell me if it is ready for staging`

ECC should do:

1. route to `/aw:review`
2. resolve the repo's `.aw_sdlc/profile.yml` and selected baseline
3. run the relevant review-owned verification layers in order and request `/aw:test` only when fresh evidence is still missing
4. skip any layer marked `enabled: false`
5. use the configured playbooks, commands, and external providers for enabled layers
6. write one `verification.md`

So the command is stable, but the actual checks are repo-configured.

### Deploy Flow

When the user says:

`Deploy this verified worker to staging`

ECC should do:

1. route to `/aw:deploy`
2. resolve the repo's `.aw_sdlc/profile.yml` and selected baseline
3. select mode `staging`
4. resolve the correct versioned staging pipeline from the profile
5. execute the deploy path
6. write one `release.md`

Again: stable command, configurable execution.

## 11. What Code Review Means In This Model

You specifically said code review must apply certain rules and cover different areas.

That fits exactly into `verify.code_review`.

This layer should support:

- a mandatory baseline review
- optional domain reviews
- repo-specific review policies

Example:

```yaml
code_review:
  enabled: true
  baseline_playbooks:
    - platform-review:code-review-pr
  domain_playbooks:
    - platform-frontend:design-review
    - platform-frontend:i18n-review
    - platform-frontend:security-review
  rulesets:
    - platform/root
    - platform/frontend
    - platform/security
```

So code review is not a separate public command.
It is a configured subset of `verify`.

## 12. What PR Governance Means In This Model

This belongs in `verify.pr_governance`.

It should answer:

- are required status checks green?
- are quality gates green?
- does the PR description exist?
- is the PR description checklist complete?
- did the PR author explicitly mark what was verified?
- are required approvals present?
- is it acceptable for merge or staging deploy?

This keeps PR and approval governance distinct from code review but still inside `verify`.

## 13. What Staging Readiness Means In This Model

This belongs in `verify.release_readiness`.

It should answer:

- is the change safe for staging?
- are migrations safe?
- is the rollback path known?
- is staging recommended now?

This layer does not deploy.
It only produces the readiness decision.

Actual deployment belongs to `/aw:deploy`.

## 14. What Testing Means In This Model

You wanted the testing model to support:

1. local unit/integration testing
2. end-to-end testing
3. external pipeline or external app testing

That maps directly to:

- `local_validation`
- `e2e_validation`
- `external_validation`

So the engine does not care whether E2E lives:

- in this repo
- in a separate test repo
- in a different app or pipeline

The profile decides that.

## 15. What GHL Staging Deployment Means In Practice

The current GHL baseline should only concretely encode staging deployment, because the staging path is already well documented and mechanized.

### Microfrontends

- use versioned Jenkins pipelines under `staging-versions/`
- deploy the MFA bundle with `deploy_version`
- deploy the `spm-ts` consumer with the same version string when required
- verify the versioned `remoteEntry.js` URL resolves
- verify the shell points at the versioned remote and requests carry `developer_version`

### Microservices

- use versioned Jenkins server pipelines under `staging-versions/`
- deploy with `deploy_version(..., type: "server")`
- verify the service is reachable in staging
- verify health endpoints and basic smoke tests
- verify versioned routing signals remain aligned with `IS_VERSIONED_DEPLOYMENT` and `DEVELOPER_VERSION` where used

### Workers

- use versioned Jenkins worker pipelines under `staging-versions/`
- deploy with `deploy_version(..., type: "workers")`
- verify pods are healthy
- verify queue or subscription processing is healthy
- verify worker-specific smoke evidence after deployment

## 16. Output Contract

### `verification.md`

Should always contain:

- `Requested Goal`
- `Profile Used`
- `Layer Results`
- `Evidence`
- `Findings`
- `PR Readiness`
- `Release Readiness`
- `Overall Status`
- `Recommended Next`

### `release.md`

Should always contain:

- `Requested Goal`
- `Profile Used`
- `Selected Mode`
- `Pipeline or Provider`
- `Version Strategy`
- `Versioned Links`
- `Build Links`
- `Testing Automation Build Links`
- `Build Status`
- `Execution Evidence`
- `Rollback Path`
- `Outcome`
- `Recommended Next`

`Versioned Links` should be owned by `deploy`, not left implicit.

Typical examples:

- microfrontend:
  - versioned `remoteEntry.js` URL
  - shell or `spm-ts` validation URL using the same version signal
- microservice:
  - versioned staging service URL
  - health or smoke URL
  - routing reference when `DEVELOPER_VERSION` or similar is used
- worker:
  - Jenkins/build URL
  - worker workload or job reference
  - queue or subscription health reference when available

`Build Links` should contain the primary build or deploy automation URLs owned by the release path.

Typical examples:

- Jenkins staging pipeline URL
- PR creation link
- deployment job URL

`Testing Automation Build Links` should contain the validation automation URLs tied to release readiness when they exist.

Typical examples:

- GitHub Actions run URL
- Jenkins test job URL
- external E2E repo run URL

`Build Status` should summarize the outcome for each relevant automation entry.

Typical examples:

- deploy build: `SUCCESS`
- testing automation build: `SUCCESS`
- external E2E run: `NOT_AVAILABLE`

If a real URL is unavailable, `deploy` should still record the missing system or blocker explicitly instead of omitting the section.

## 17. Why This Is Decoupled

This is decoupled because:

- the command names do not change per repo
- the stage layers do not change per repo
- the output contracts do not change per repo
- only the repo-owned profile changes

So ECC is coupled to:

- the schema
- the stage model
- the output model

and not coupled to:

- a specific Jenkins pipeline path
- a specific test repo
- a specific deployment command
- a specific review toolchain

## 18. GHL Baseline Defaults

The intended 90% defaults are the YAML baseline catalogs:

- [profiles.yml](/Users/prathameshai/Documents/Agentic%20Workspace/platform-docs/.aw_registry/platform/core/defaults/aw-sdlc/profiles.yml)
- [baseline-profiles.yml](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/defaults/aw-sdlc/baseline-profiles.yml)

Use the safe fallback only when archetype detection fails:

- `ghl-safe-fallback` inside the same YAML catalog

### Why These Baselines Are Stronger

- frontend baseline uses:
  - strong general code review
  - frontend-specialized review
  - design/accessibility review
  - unit/integration/lint/typecheck/build validation
  - E2E repo guidance
  - PR checklist and quality gates
  - versioned MFA staging
- microservice baseline uses:
  - strong general code review
  - unit/integration/lint/typecheck/build validation
  - PR governance + quality gates
  - release readiness
  - versioned service staging
- worker baseline uses:
  - strong general code review
  - unit/lint/typecheck/build validation
  - worker health and subscription-aware readiness
  - PR governance
  - versioned worker staging evidence

### Recommended Override Model

A repo-local profile should be able to extend the chosen GHL baseline and override only what changes.

Example:

```yaml
extends: ghl-microfrontend-standard

verify:
  e2e_validation:
    enabled: true
    provider: external-repo
    repo_hint: ai-marketplace-tests
```

This gives strong defaults for most repos while still preventing accidental production coupling in unknown repos.
