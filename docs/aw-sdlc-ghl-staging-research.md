# GHL Staging Verification and Deployment Research

## Goal

Capture the concrete GHL reality that should drive the first `verify` and `deploy` defaults.

This document is intentionally narrow:

- verification must be strong
- PR checklist compliance must be checked
- deployment coverage is staging only
- deployment coverage must work for MFAs, microservices, and workers

## Verify Findings

### 1. Code review already has a strong GHL baseline

The existing GHL review skill already runs a five-reviewer parallel code review:

- security
- performance
- architecture
- reliability
- maintainability

This makes `platform-review:code-review-pr` the right default anchor for `verify.code_review`.

### 2. Quality gates are a real GHL governance layer

The quality-gates system already models org-level and team-level enforcement with required statuses and exception handling.

That means quality gates belong in `verify`, not in a separate command.

### 3. Local validation should explicitly include unit testing

GHL testing docs already describe unit test setup and coverage expectations, including Jest-based coverage workflows and PR template reminders for unit-test verification.

That means `verify.local_validation` should explicitly include:

- unit
- integration
- lint
- typecheck
- build

with unit tests treated as mandatory.

### 4. E2E often lives outside the implementation repo

GHL has dedicated Playwright test repos by product area:

- `core-crm-tests`
- `leadgen-tests`
- `revex-tests`
- `ai-marketplace-tests`

So `verify.e2e_validation` must support:

- same-repo E2E
- mapped external test repo

### 5. PR checklist verification should be a first-class layer

The user requirement is correct: verification should not only run checks, it should also confirm the PR description/checklist says what was verified and that the required items are actually checked.

That means `verify.pr_governance` should include:

- PR description present
- PR description checklist complete
- explicit verification items checked
- required status checks green
- required approvals present
- quality gates green

## Deploy Findings

### 1. MFA staging deploy is a versioned two-step flow

For microfrontends, versioned staging is not a single generic deploy.

It requires:

1. deploy the MFA bundle through a `staging-versions` Jenkins pipeline
2. deploy `spm-ts` with the same version string when the shell must point at the versioned remote

Key mechanics:

- CDN-hosted `remoteEntry.js`
- versioned path suffix
- `developer_version`-aware shell routing

So MFA staging should be modeled as a dedicated `versioned-mfa` deploy path, not as generic frontend deploy.

### 2. Microservice staging deploy is versioned in many GHL repos

Repo and pipeline docs show server repos using `staging-versions` Jenkins pipelines and `deploy_version(..., type: "server")`.

Versioned service deploys also line up with:

- `IS_VERSIONED_DEPLOYMENT`
- `DEVELOPER_VERSION`
- `developer_version` routing signals

So service staging should default to a `versioned-service` deploy path.

### 3. Worker staging deploy is also versioned

Worker repos and pipeline docs show versioned worker pipelines under `staging-versions` and `deploy_version(..., type: "workers")`.

Worker post-deploy evidence is different from service evidence. It should include:

- worker pod health
- queue or subscription health
- worker-specific smoke evidence

So worker staging should default to a `versioned-worker` deploy path.

## Recommended Default Model

### Verify Layers

1. `code_review`
2. `local_validation`
3. `e2e_validation`
4. `external_validation`
5. `pr_governance`
6. `release_readiness`

### Deploy Modes

- `pr`
- `branch`
- `staging`

### Staging Provider Model

- Provider transport: `ghl-ai`
- MFA mechanism: `versioned-mfa-staging`
- Microservice mechanism: `versioned-service-staging`
- Worker mechanism: `versioned-worker-staging`

## Primary Sources Used

- [code-review-pr skill](/Users/prathameshai/.aw_registry/platform/review/skills/code-review-pr/SKILL.md)
- [quality-gates skill](/Users/prathameshai/.aw_registry/platform/sdet/skills/quality-gates/SKILL.md)
- [deploy-versioned-mfa skill](/Users/prathameshai/.aw_registry/platform/infra/skills/deploy-versioned-mfa/SKILL.md)
- [staging-deploy skill](/Users/prathameshai/.aw_registry/platform/infra/skills/staging-deploy/SKILL.md)
- [test-repos-guide skill](/Users/prathameshai/.aw_registry/platform/sdet/skills/test-repos-guide/SKILL.md)
- [production-readiness skill](/Users/prathameshai/.aw_registry/platform/infra/skills/production-readiness/SKILL.md)
- [e2e-testing-repos.md](/Users/prathameshai/Documents/Agentic%20Workspace/platform-docs/content/testing/e2e-testing-repos.md)
- [add-code-coverage.md](/Users/prathameshai/Documents/Agentic%20Workspace/platform-docs/content/infra/how-to/add-code-coverage.md)
- [ghl-crm-frontend.md](/Users/prathameshai/Documents/Agentic%20Workspace/platform-docs/content/repos-documentation/ghl-crm-frontend.md)
- [marketplace-backend.md](/Users/prathameshai/Documents/Agentic%20Workspace/platform-docs/content/repos-documentation/marketplace-backend.md)
- [marketplace-pipelines.md](/Users/prathameshai/Documents/Agentic%20Workspace/platform-docs/content/pipelines/marketplace-pipelines.md)
- [feature-flags.md](/Users/prathameshai/Documents/Agentic%20Workspace/platform-docs/content/services/feature-flags.md)
- [base-service.md](/Users/prathameshai/Documents/Agentic%20Workspace/platform-docs/content/services/packages/base-service.md)
- [behind-the-scenes.md](/Users/prathameshai/Documents/Agentic%20Workspace/platform-docs/content/infra/ns-migration/behind-the-scenes.md)
