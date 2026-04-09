---
name: using-platform-skills
description: Select the smallest correct GHL platform skill stack after the AW stage is known. Use when the task touches backend services, frontend MFAs, data systems, infra, review, test, or product-specific platform context.
---

# Using Platform Skills

## Overview

This is the second-hop router for GHL-specific work.
Use it after `using-aw-skills` has already selected the primary AW stage.

Its job is to:

- identify the touched GHL domain
- pick the smallest correct platform family
- choose the first supporting platform skills for the selected stage
- avoid loading every platform playbook by default

## When to Use

- the primary AW stage is already known
- the task touches a real GHL backend, worker, frontend, data, infra, test, review, or product surface
- platform-specific conventions materially change how the stage should be done

Do not use:

- before the primary AW stage is selected
- for generic non-GHL work
- when no platform family materially changes the implementation, test, review, or deploy path

## Skill Discovery

After the AW stage is selected, choose the platform family:

```text
Primary AW stage selected
    │
    ├── Backend service or worker? ───────────────→ platform-services:*
    ├── Frontend MFA or design-system work? ─────→ platform-frontend:* + platform-design:*
    ├── Data store, analytics, search, cache,
    │   or data migration work? ──────────────────────→ platform-data:*
    ├── Infra or deploy path work? ──────────────→ platform-infra:*
    ├── Test system or QA governance work? ──────→ platform-sdet:*
    ├── Formal review or readiness work? ────────→ platform-review:*
    └── Product-context ambiguity? ──────────────→ platform-product:*
```

Then choose the smallest supporting skills for the current stage.

## Workflow

1. Confirm the AW stage first.
   Do not pick platform skills until the primary route is clear.
2. Identify the touched surface.
   Backend, frontend, data, infra, review, test, or product context.
3. Choose the first platform family.
   Start from the family that most directly changes the current stage behavior.
4. Add only the first supporting platform skills.
   Prefer the smallest stack that changes implementation quality, test evidence, review depth, or release safety.
   Do not duplicate planning-process skills already owned by `aw-plan`, `aw-spec`, `aw-tasks`, or Addy-style planning helpers.
5. Add craft skills only if they sharpen the same stage.
   Do not let craft skills replace platform families or vice versa.

## Stage-to-Platform Matrix

### Backend services and workers

| AW stage | First platform skills to load |
|---|---|
| `aw-plan` | `platform-services:development` |
| `aw-build` | `platform-services:development` |
| `aw-investigate` | `platform-infra:grafana` |
| `aw-test` | `platform-sdet:quality-gates` |
| `aw-review` | `platform-review:code-review-pr`, `platform-sdet:quality-gates` |
| `aw-deploy` | `platform-infra:staging-deploy`, `platform-infra:deployment-strategies`, `platform-infra:production-readiness` |
| `aw-ship` | `platform-review:code-review-pr`, `platform-infra:staging-deploy`, `platform-infra:production-readiness` |

### Frontend MFAs and design-system work

| AW stage | First platform skills to load |
|---|---|
| `aw-plan` | `platform-design:system`, `platform-frontend:vue-development` |
| `aw-build` | `platform-frontend:vue-development`, `highrise-ui-governance`, `quality-gate-coder` |
| `aw-investigate` | `platform-infra:grafana` when runtime signals matter; otherwise use the smallest relevant frontend family |
| `aw-test` | `platform-frontend:a11y-review`, `platform-sdet:quality-gates` |
| `aw-review` | `platform-review:code-review-pr`, `platform-design:review`, `platform-frontend:a11y-review`, `platform-sdet:quality-gates` |
| `aw-deploy` | `deploy-versioned-mfa`, `platform-infra:staging-deploy`, `platform-infra:production-readiness` |
| `aw-ship` | `deploy-versioned-mfa`, `platform-infra:staging-deploy`, `platform-infra:production-readiness` |

### Data, migration, and storage work

`platform-data:*` is the family for the data team surface.
Use it for:

- transactional databases
- document stores
- analytical databases and warehouses
- search indexes
- realtime data stores
- cache and key-value systems
- migration and cross-database movement

Current concrete data families include:

- `platform-data:cloudsql-clickhouse` for CloudSQL and ClickHouse
- `platform-data:mongodb-patterns`
- `platform-data:firestore-patterns`
- `platform-data:redis-patterns`
- `platform-data:elasticsearch-patterns`
- `platform-data:migration-patterns`

Keep infra ownership separate:

- provisioning clusters, secrets, Helm, Terraform, Jenkins, or deploy topology -> `platform-infra:*`
- modeling schemas, indexes, migrations, sync workers, queries, or search mappings -> `platform-data:*`

| AW stage | First platform skills to load |
|---|---|
| `aw-plan` | `platform-data:migration-patterns` or the narrow storage family |
| `aw-build` | `platform-data:migration-patterns`, `platform-data:mongodb-patterns`, `platform-data:redis-patterns`, `platform-data:elasticsearch-patterns`, `platform-data:cloudsql-clickhouse`, or another narrow data family |
| `aw-test` | `platform-sdet:quality-gates` |
| `aw-review` | `platform-review:code-review-pr` plus the narrow data family when contracts or safety need checking |
| `aw-deploy` / `aw-ship` | `platform-infra:deployment-strategies`, plus the narrow data family when rollout safety depends on it |

### Infra, release, and operational work

| AW stage | First platform skills to load |
|---|---|
| `aw-plan` | `platform-infra:deployment-strategies` |
| `aw-build` | `platform-infra:jenkins-pipelines`, `platform-infra:kubernetes-workloads`, `platform-infra:terraform-iac`, or another narrow infra family |
| `aw-investigate` | `platform-infra:grafana`, `platform-infra:log-analysis` |
| `aw-test` | `platform-sdet:quality-gates` |
| `aw-review` | `platform-review:code-review-pr`, `platform-infra:production-readiness` |
| `aw-deploy` | `platform-infra:staging-deploy`, `platform-infra:deployment-strategies`, `platform-infra:production-readiness` |
| `aw-ship` | `platform-infra:deployment-strategies`, `platform-infra:production-readiness` |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The AW stage is enough; platform rules can be implied." | Platform families encode real org behavior and should be selected explicitly when they matter. |
| "I'll just load everything platform-related to be safe." | Flooding the session makes routing less clear and increases noise. |
| "Frontend only needs frontend skills." | Real frontend work often also needs design, accessibility, quality-gate, or deploy support. |
| "Review and test don't need platform families." | Review depth and test evidence are some of the most platform-specific parts of the workflow. |

## Red Flags

- platform skills are chosen before the AW stage is known
- every task loads multiple platform families with no clear reason
- frontend tasks skip `platform-design:*` or accessibility support when UI quality matters
- backend tasks skip platform service conventions and jump straight to generic coding
- deploy and ship work proceed without platform infra or readiness support

## Verification

Before leaving platform selection, confirm:

- [ ] the AW stage was chosen first
- [ ] exactly one primary platform family was selected first
- [ ] the first supporting platform skills match the current AW stage
- [ ] only the smallest useful platform stack was loaded
- [ ] craft skills complement the platform stack instead of replacing it
