# AW Product Scenario Matrix

This document defines the product-specific scenario layer for the `aw-ecc` testing framework.

The goal of this layer is to prove that AW routing and stage behavior work for real GHL workflows, not only generic engineering prompts or repo-archetype abstractions.

The machine-readable source of truth lives in [aw-product-scenarios.json](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/tests/evals/fixtures/aw-product-scenarios.json).

## Coverage Goals

- Communities flows should preserve HighRise, accessibility, browser proof, and API/interface stability where relevant
- Payments flows should preserve security, readiness review quality, and governance evidence
- Memberships flows should preserve versioned MFA deployment and release evidence
- Contacts flows should preserve migration and deprecation discipline
- Automation and Workflows flows should preserve observability-first investigation, launch closeout, and ADR traceability
- the product suite should cover the whole public route surface plus `aw-yolo`

## Scenario Matrix

| Scenario | Product area | Repo archetype | Input | Expected route | Expected primary skill | Expected org standards |
|---|---|---|---|---|---|---|
| `communities-moderation-api-plan` | `communities` | `microservice` | `Create the implementation spec for the approved Communities moderation API contract and document the stable interface assumptions for downstream consumers.` | `/aw:plan` | `aw-plan` | `platform-product:knowledge`, `platform-services:development`, `api-and-interface-design` |
| `communities-feed-highrise-build` | `communities` | `microfrontend` | `Implement the approved Communities feed card update with HighRise, responsive states, accessibility guardrails, and thin save-point slices.` | `/aw:build` | `aw-build` | `highrise-ui-governance`, `platform-design:system`, `platform-frontend:accessibility`, `platform-frontend:vue-development` |
| `workflows-retry-alert-investigate` | `workflows` | `worker` | `Investigate this Workflows worker retry spike before patching anything and use logs plus worker-specific evidence to narrow the fault surface.` | `/aw:investigate` | `aw-investigate` | `platform-infra:grafana`, `platform-infra:log-analysis`, `platform-services:worker-patterns` |
| `communities-feed-browser-test` | `communities` | `microfrontend` | `Prove this Communities feed MFA fix in the browser across desktop and mobile, verify there is no console or network regression, and capture accessibility proof.` | `/aw:test` | `aw-test` | `platform-frontend:accessibility`, `platform-design:review`, `platform-sdet:playwright-pom` |
| `payments-service-readiness-review` | `payments` | `microservice` | `Review this Payments service change for correctness, security, performance, and staging readiness, and record the rationale engineers will need later.` | `/aw:review` | `aw-review` | `platform-review:code-review-pr`, `platform-sdet:quality-gates`, `documentation-and-adrs` |
| `memberships-mfa-staging-deploy` | `memberships` | `microfrontend` | `Deploy this verified Memberships MFA change to staging, resolve the correct versioned deploy path, and capture rollback plus release evidence.` | `/aw:deploy` | `aw-deploy` | `deploy-versioned-mfa`, `platform-infra:deployment-strategies`, `platform-infra:production-readiness` |
| `automation-worker-launch-ship` | `automation` | `worker` | `Prepare the Automation worker release closeout with rollout notes, rollback readiness, and monitoring checkpoints before we call this launch complete.` | `/aw:ship` | `aw-ship` | `platform-infra:production-readiness`, `documentation-and-adrs` |
| `memberships-mfa-end-to-end-yolo` | `memberships` | `microfrontend` | `Take this approved Memberships MFA change from implementation-ready inputs to staging end to end, while keeping HighRise, accessibility, review, and release evidence intact.` | `aw-yolo` | `aw-yolo` | `highrise-ui-governance`, `platform-design:system`, `platform-frontend:accessibility`, `deploy-versioned-mfa` |
| `legacy-webhook-migration-plan` | `contacts` | `microservice` | `Plan the migration off the legacy Contacts webhook endpoint, identify consumers, and define the deprecation path before implementation starts.` | `/aw:plan` | `aw-plan` | `deprecation-and-migration`, `documentation-and-adrs`, `platform-product:knowledge` |
| `queue-retry-adr-review` | `automation` | `microservice` | `Review the queue-based retry decision, capture the ADR trail, and document the interface guardrails we need to preserve for future work.` | `/aw:review` | `aw-review` | `documentation-and-adrs`, `platform-review:code-review-pr`, `platform-product:knowledge` |

## Why This Layer Matters

Capability-layer cases prove coverage.

Archetype-layer cases prove repo-shape behavior.

Product-layer cases prove that:

- routing remains correct for real GHL nouns, systems, and constraints
- org standards are not generic abstractions but concrete guardrails
- release flows reflect actual versioned MFA and worker deployment behavior
- planning, review, and migration work use the same stage model without losing product context

## Validation Expectations

The deterministic product suite should prove:

1. the fixture validates against the shared scenario schema
2. every scenario id is unique
3. every route maps to the correct primary skill
4. every supporting skill and org-standard skill resolves on disk
5. the matrix covers the whole public route surface plus `aw-yolo`
6. the matrix includes Communities, Payments, Memberships, Contacts, Automation, and Workflows examples
7. the matrix doc stays aligned with the machine-readable fixture
