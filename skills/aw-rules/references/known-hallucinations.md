# Known Hallucination Patterns

AI-generated `.aw_rules/` content commonly fabricates these patterns. Check for them first.

## Package Names

| Hallucinated | Real |
|-------------|------|
| `@highrise/components` | `@platform-ui/highrise` |
| `@platform-core/auth` | `@platform-core/iam-v2` |
| `@platform-core/workers` | `@platform-core/base-worker` |
| `HlButton` (lowercase l) | `HLButton` (uppercase L) |

## API Patterns

| Hallucinated | Real |
|-------------|------|
| `v-model` on HL inputs | `v-model:value` |
| `v-model:open` on modals | `v-model:show` |
| `IamGuard` decorator | `IAM.auth(req, authConfigs)` |
| `@UseGuards(IamGuard)` import from package | Teams create own guard wrapping `IAM.auth()` |
| `readonly topic/subscription` on BaseWorker | `getSubscriptionName()` method |
| `processMessage(): Promise<void>` | `processMessage(): Promise<{ success: boolean; error: any }>` |

## Infrastructure

| Hallucinated | Real |
|-------------|------|
| `git::github.com/ghl/terraform-platform-modules` | Local `../modules/frontend-apps-infra` |
| `data.google_secret_manager_secret_version` for secrets | `secrets:` block in values.yaml (Helm fetches) |
| `helm rollback contacts-api 0` | `Deployment-Revision-Rollback` Jenkins pipeline |
| `kubectl patch service` for blue-green | Jenkins `DeploymentOption` parameter |
| `/health/live`, `/health/ready` as defaults | Default probe path is `/` on port `6050` |
| KEDA `ScaledObject` recommended | KEDA is deprecated — use `peakLoad.peakLoadMinReplicas` |
| `docker build -t ...` in Jenkinsfile | `marketplace_backend_base()` shared library function |

## Observability

| Hallucinated | Real |
|-------------|------|
| Cloud Logging → log-based metrics | Prometheus → Mimir → Grafana |
| PagerDuty alerts | Unverified — no docs confirm |
| `@platform-core/observability` (no version) | `@platform-core/observability>=4.0.0` |
