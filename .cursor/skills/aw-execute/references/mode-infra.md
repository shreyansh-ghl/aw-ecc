# Mode: Infra — Dry-Run First

## Core Principle

> **Never apply infrastructure changes directly. Validate first, deploy via Jenkins.**

## Process

### 1. Validate

- Run `helm lint` for Helm chart changes.
- Run `terraform plan` for Terraform changes.
- Run `docker build` to verify Dockerfile changes.
- Review the diff carefully before proceeding.

### 2. Dry-Run

- `terraform plan -out=tfplan` — Review every resource change.
- `helm template` — Render and inspect the full manifest.
- `helm diff upgrade` — Compare current state with proposed changes.

### 3. Deploy via Jenkins

- **Never** run `kubectl apply`, `helm install`, or `terraform apply` directly.
- Use Jenkins shared library functions for all deployments.
- Trigger deployments via Jenkins pipeline, not CLI.

### 4. Verify

- Check pod status after deployment.
- Verify health probes are responding.
- Check logs for startup errors.
- Confirm the change is reflected in the running system.

## Platform Rules

- **Resource requests** — Set `resources.requests` for every container. Limits auto-calculated for servers.
- **Health probes** — Configure for every deployment (default path `/` on port 6050).
- **No CPU limits = requests** — Never set CPU limits equal to CPU requests (causes throttling).
- **No secrets in Helm** — Use GCP Secret Manager, not Helm values or ConfigMaps.
- **No KEDA** — KEDA is deprecated. Use `peakLoad.peakLoadMinReplicas` instead.
- **Pin image tags** — Never use `latest`. Use specific digest or semver.
- **Graceful shutdown** — `terminationGracePeriodSeconds` >= 30 seconds.
- **Terraform managed** — All GCP resources via Terraform. No manual console changes.
