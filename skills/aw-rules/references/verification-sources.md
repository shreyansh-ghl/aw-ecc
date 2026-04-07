# Verification Sources by Domain

Where to look when validating a rule file's code examples and patterns.

## Backend

| Pattern | Verify Against |
|---------|---------------|
| `@platform-core/logger` | `platform/services/skills/structured-logging/SKILL.md` |
| `@platform-core/base-worker` | `platform/services/skills/worker-patterns/SKILL.md` |
| `@platform-core/iam-v2` | `platform/services/skills/authentication-authorization/SKILL.md` |
| NestJS module structure | `platform/services/skills/development/SKILL.md` |
| class-validator DTOs | `platform/services/skills/development/SKILL.md` |

## Frontend

| Pattern | Verify Against |
|---------|---------------|
| `@platform-ui/highrise` components | `platform/frontend/skills/highrise-compliance/SKILL.md` |
| `v-model:value`, `v-model:show` | `platform/frontend/skills/highrise-compliance/references/` |
| `@tanstack/vue-query` | `platform/frontend/skills/vue-development/references/query-store-pattern.md` |
| Vue 3 Composition API | `platform/frontend/skills/vue-development/SKILL.md` |
| `@platform-ui/sentry` | `platform/frontend/skills/vue-development/SKILL.md` |

## Infra

| Pattern | Verify Against |
|---------|---------------|
| Helm values (resources, probes) | `platform/docs/infra/how-to/server/values-server.md` |
| Worker values | `platform/docs/infra/how-to/worker/` |
| Terraform modules | `platform/docs/infra/how-to/terraform-for-frontend-apps.md` |
| Jenkins shared library | `platform/docs/infra/how-is-this-working/jenkins-library.md` |
| Blue-green deploy | `platform/docs/infra/blue-green/` |
| Secret management | `platform/docs/infra/how-to/secret-management.md` |
| Rollback | `platform/docs/infra/how-to/how-to-revision-rollback-deployments.md` |
| KEDA (deprecated) | `platform/docs/infra/how-to/how-to-use-keda-autoscaling.md` |

## Security

| Pattern | Verify Against |
|---------|---------------|
| IAM v2 auth | `platform/services/skills/authentication-authorization/SKILL.md` |
| DOMPurify | `platform/frontend/skills/vue-development/SKILL.md` |

## Data

| Pattern | Verify Against |
|---------|---------------|
| Mongoose v8 schemas | `platform/data/skills/mongodb-patterns/SKILL.md` |
| Redis patterns | `platform/data/skills/redis-patterns/SKILL.md` |
