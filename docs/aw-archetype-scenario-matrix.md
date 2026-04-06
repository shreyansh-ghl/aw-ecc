# AW Archetype Scenario Matrix

This document defines the repo-archetype layer for the `aw-ecc` testing framework.

The goal of this layer is to prove that the same stage model behaves correctly across different repo shapes, not only across generic capability prompts.

The machine-readable source of truth lives in [aw-archetype-scenarios.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-archetype-scenarios.json).

## Coverage Goals

- microservice behavior should preserve contract-first planning, service-layer build discipline, review governance, and staging deployment clarity
- worker behavior should emphasize observability-first investigation and launch-closeout discipline
- microfrontend behavior should emphasize HighRise, accessibility, browser proof, and versioned deployment paths
- the archetype suite should cover the whole public route surface plus `aw-yolo`

## Scenario Matrix

| Scenario | Repo archetype | Input | Expected route | Expected primary skill | Expected org standards |
|---|---|---|---|---|---|
| `microservice-contract-plan` | `microservice` | `Create the implementation spec for the approved Communities moderation API contract and keep the interface stable for downstream consumers.` | `/aw:plan` | `aw-plan` | `api-and-interface-design`, `platform-services:development` |
| `microservice-approved-build` | `microservice` | `Implement the approved contact sync service change in thin reversible increments, keep save points reviewable, and follow the service quality gates.` | `/aw:build` | `aw-build` | `platform-services:development`, `platform-sdet:quality-gates`, `git-workflow-and-versioning` |
| `worker-alert-investigate` | `worker` | `Investigate this workflow worker retry spike before patching anything and use logs plus worker-specific evidence to narrow the fault surface.` | `/aw:investigate` | `aw-investigate` | `platform-infra:grafana`, `platform-infra:log-analysis`, `platform-services:worker-patterns` |
| `microfrontend-browser-proof` | `microfrontend` | `Prove this Communities feed MFA fix in the browser by checking DOM state, console noise, network requests, responsive behavior, and accessibility expectations.` | `/aw:test` | `aw-test` | `platform-frontend:accessibility`, `platform-design:review`, `platform-sdet:playwright-pom` |
| `microservice-readiness-review` | `microservice` | `Review this payments service change for correctness, security, performance, and staging readiness, and capture the supporting rationale engineers will need later.` | `/aw:review` | `aw-review` | `platform-review:code-review-pr`, `platform-sdet:quality-gates`, `documentation-and-adrs` |
| `microservice-staging-deploy` | `microservice` | `Deploy this verified contact sync service to staging, resolve the correct provider path, and capture rollback plus release evidence.` | `/aw:deploy` | `aw-deploy` | `platform-infra:staging-deploy`, `platform-infra:deployment-strategies`, `platform-infra:production-readiness` |
| `worker-launch-closeout` | `worker` | `Prepare the worker release closeout with rollout notes, rollback readiness, and monitoring checkpoints before we call this launch complete.` | `/aw:ship` | `aw-ship` | `platform-infra:production-readiness`, `documentation-and-adrs` |
| `microfrontend-yolo-staging` | `microfrontend` | `Take this approved memberships MFA change from implementation-ready inputs to staging end to end, while keeping HighRise, accessibility, review, and release evidence intact.` | `aw-yolo` | `aw-yolo` | `highrise-ui-governance`, `platform-design:system`, `platform-frontend:accessibility`, `deploy-versioned-mfa` |

## Why This Layer Matters

Capability-layer cases prove that skills and routes exist.

Archetype-layer cases prove that:

- routing remains correct when repo shape changes
- org standards vary correctly by archetype
- deployment and shipping expectations reflect the actual release surface
- frontend, backend, and worker flows do not collapse into one generic workflow

## Validation Expectations

The deterministic archetype suite should prove:

1. the fixture validates against the archetype schema
2. every scenario id is unique
3. every route maps to the correct primary skill
4. every supporting skill and org-standard skill resolves on disk
5. microservice, worker, and microfrontend archetypes are all covered
6. the matrix doc stays aligned with the machine-readable fixture
