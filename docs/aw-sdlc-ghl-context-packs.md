# AW SDLC GHL Context Packs

## Purpose

`aw_rules` already gives us the GHL standards layer.

What `verify` and `deploy` still need is a deterministic way to load:

1. the right GHL rules
2. the right GHL references
3. the right GHL step-by-step operational playbooks

This document defines that layer.

## Core Idea

Do not create a second rule system.

Instead, use a three-layer context pack:

| Layer | Role | Source |
|---|---|---|
| rules | what must be true | `.aw_rules/**/AGENTS.md` |
| references | deeper standards and examples | `.aw_rules/**/references/*.md` and `platform-docs/content/**` |
| playbooks | how to execute the workflow in GHL | `.aw_registry/platform/**/skills/*.md` |

The rule says what good looks like.
The reference explains the standard.
The playbook gives the operational steps.

## Where This Applies

This matters most for:

- `/aw:verify`
- `/aw:deploy`

because those stages must do more than reason abstractly. They must follow GHL's real testing and release workflows.

## Command Contract Extension

Every public command should keep `source_of_truth`, but `verify` and `deploy` should also resolve a `context_pack`.

Recommended shape:

```yaml
context_pack:
  stage: verify | deploy
  domain: frontend | backend | data | infra | mixed
  mode: quality | review | readiness | pr | branch | staging | production
  rules: []
  references: []
  playbooks: []
  required_steps: []
```

This makes the loaded context explicit and testable.

## 1. Verify Context Pack

### Goal

Tell the agent how testing and validation work in GHL for the touched area.

### Always Load

- `platform-docs/.aw_rules/AGENTS.md`
- `platform-docs/.aw_rules/platform/sdet/AGENTS.md`
- `platform-docs/.aw_rules/platform/universal/AGENTS.md` when relevant
- touched domain rules such as:
  - `platform-docs/.aw_rules/platform/frontend/AGENTS.md`
  - `platform-docs/.aw_rules/platform/backend/AGENTS.md`
  - `platform-docs/.aw_rules/platform/data/AGENTS.md`

### Testing References

- `platform-docs/.aw_rules/platform/sdet/references/test-case-traceability.md`
- `platform-docs/.aw_rules/platform/sdet/references/playwright-pom.md`
- `platform-docs/.aw_rules/platform/sdet/references/shared-test-core.md`
- `platform-docs/content/testing/e2e-testing-repos.md`

### Testing Playbooks

- `platform-sdet:test-repos-guide`
- `platform-sdet:playwright-pom`
- `platform-sdet:testing-e2e`
- `platform-sdet:quality-gates`
- `platform-sdet:test-management` when test-case linkage matters

### Domain-Specific Verify Add-ons

#### Frontend

- `platform-design:review`
- `platform-frontend:a11y-review`
- `platform-frontend:i18n-review`
- `platform-design:pixel-fidelity-review` when design fidelity matters

#### Backend / Services

- backend/domain `AGENTS.md`
- data migration references when DB changes are involved
- service/domain testing guidance from the repo itself

#### Data / Migration

- `platform-docs/.aw_rules/platform/data/references/migration-checklist.md`
- migration-specific validation and rollback checks

### Required Verify Steps

The `verify` command should follow this order:

1. Identify the touched domain and verify mode.
2. Load root rules, SDET rules, and touched domain rules.
3. Resolve the correct GHL testing playbook:
   - local unit/integration tests
   - shared E2E repo flow
   - quality gates
   - design/a11y review when applicable
4. Run or validate evidence, not just review prose.
5. Compare the result against planning artifacts and `aw_rules`.
6. Write `verification.md` with evidence, findings, readiness, and next step.
7. Persist loaded context into `state.json`.

### Verify Output Additions

`verification.md` should include:

- `Context Loaded`
- `Rules Applied`
- `Playbooks Used`
- `Evidence Run`
- `Findings`
- `Readiness`

`state.json` should include:

```json
{
  "verify": {
    "context_pack": {
      "rules": [],
      "references": [],
      "playbooks": []
    }
  }
}
```

## 2. Deploy Context Pack

### Goal

Tell the agent how deployment and release handoff work in GHL for the selected release path.

### Always Load

- `platform-docs/.aw_rules/AGENTS.md`
- `platform-docs/.aw_rules/platform/infra/AGENTS.md`
- touched domain rules when relevant
- data rules when deploy includes migrations

### Deployment References

- `platform-docs/.aw_rules/platform/infra/references/ci-cd-pipelines.md`
- `platform-docs/.aw_rules/platform/infra/references/kubernetes-workloads.md`
- `platform-docs/.aw_rules/platform/infra/references/observability.md`
- blue-green and versioning docs in `platform-docs/content/infra/**`
- data migration references when rollout includes schema/index changes

### Deployment Playbooks

- `platform-infra:deployment-strategies`
- `platform-infra:jenkins-pipelines`
- `platform-infra:staging-deploy`
- `platform-infra:production-readiness`
- `platform-infra:grafana` for post-deploy verification

### Domain-Specific Deploy Add-ons

#### Backend / Worker

- `platform-infra:kubernetes-workloads`
- `platform-infra:observability`

#### Frontend / MFA

- `deploy-versioned-mfa`
- frontend blue-green and versioned deploy docs

#### Data / Migration

- `platform-docs/.aw_rules/platform/data/references/migration-checklist.md`
- require rollout ordering and rollback path before production

### Required Deploy Steps

The `deploy` command should follow this order:

1. Confirm `verify` already passed for the current change.
2. Identify release mode: `pr`, `branch`, `staging`, or `production`.
3. Load infra rules plus any domain-specific release rules.
4. Resolve the right GHL release playbook:
   - Jenkins pipeline path
   - versioned deploy path
   - blue-green path
   - PR or branch handoff path
5. Capture release evidence:
   - pipeline/build references
   - workload or version references
   - staging/prod URLs when relevant
   - rollback path
6. Write `release.md`.
7. Persist loaded context and release outcome into `state.json`.

### Deploy Output Additions

`release.md` should include:

- `Context Loaded`
- `Release Path`
- `Rules Applied`
- `Playbooks Used`
- `Execution Evidence`
- `Rollback Path`
- `Outcome`
- `Learning`

`state.json` should include:

```json
{
  "deploy": {
    "context_pack": {
      "rules": [],
      "references": [],
      "playbooks": []
    },
    "outcome": {
      "mode": "staging",
      "evidence": []
    }
  }
}
```

## Selection Rules

The command should not load every testing or deployment skill.

It should select the minimum valid context pack:

- UI change -> SDET + frontend verify pack
- backend API change -> SDET + backend verify pack
- migration -> SDET + data verify pack + migration checklist
- staging deploy -> infra deploy pack
- production deploy -> infra deploy pack + production readiness + rollback path

## Why This Is Better Than More Commands

This keeps the public UX small:

- `plan`
- `execute`
- `verify`
- `deploy`

while still giving `verify` and `deploy` enough GHL-specific depth to behave correctly.

So the model becomes:

- `aw_rules` tells the command the standards
- references explain the standards
- playbooks tell the command the real GHL steps
- `verification.md` and `release.md` show what context was loaded and what was done

## Recommendation

Do this in three steps:

1. Keep `platform-docs` as the source of truth for rules and references.
2. Treat `.aw_registry` skills as the procedural playbooks for verify and deploy.
3. Make `verify` and `deploy` resolve and record a `context_pack` before they run.

## How To Keep This Decoupled

Use the content, but do not hard-wire the commands to repo-specific file paths.

The clean split is:

- `platform-docs` owns the content
- `aw-ecc` owns the contract and resolver
- consuming products own installation and sync

### Ownership

| Repo | Owns |
|---|---|
| `platform-docs` | rules, references, playbooks, context-pack definitions |
| `aw-ecc` | command contracts, context-pack schema, resolver logic, tests |
| consuming workspace | synced snapshot and runtime wiring |

### Rule

Commands should depend on `context_pack` IDs, not raw file paths.

Good:

```yaml
context_pack_id: verify/frontend/quality
```

Bad:

```yaml
load:
  - /Users/.../platform-docs/.aw_rules/platform/sdet/AGENTS.md
  - /Users/.../.aw_registry/platform/sdet/skills/playwright-pom/SKILL.md
```

### Recommended Interface

`aw-ecc` should resolve packs through a small interface like:

```ts
resolveContextPack({
  stage: 'verify',
  domain: 'frontend',
  mode: 'quality',
})
```

and get back:

```json
{
  "id": "verify/frontend/quality",
  "rules": [
    "platform/root",
    "platform/sdet",
    "platform/frontend"
  ],
  "references": [
    "sdet/test-case-traceability",
    "sdet/playwright-pom",
    "sdet/shared-test-core"
  ],
  "playbooks": [
    "platform-sdet:test-repos-guide",
    "platform-sdet:playwright-pom",
    "platform-design:review"
  ],
  "required_steps": [
    "load_rules",
    "resolve_test_repo",
    "run_evidence",
    "check_rules",
    "write_verification"
  ]
}
```

### Where Definitions Should Live

The canonical pack definitions should live in `platform-docs`, for example as a machine-readable manifest:

```text
platform-docs/
  .aw_registry/
    manifests/
      context-packs.json
```

or:

```text
platform-docs/
  .aw_registry/
    context-packs/
      verify.frontend.quality.json
      verify.backend.readiness.json
      deploy.staging.backend.json
      deploy.production.mfa.json
```

`aw-ecc` should not be the authoring home for those definitions. It should only consume them.

### What ECC Should Own

`aw-ecc` should own:

- the schema for a valid context pack
- the resolver that maps stage + mode + domain to a pack ID
- fallback behavior if a pack is missing
- evals that assert the right pack is selected

That means the ECC side can be stable even if the underlying GHL playbooks evolve.

### What State Should Store

`state.json` should store resolved IDs and versions, not duplicated content.

Example:

```json
{
  "verify": {
    "context_pack_id": "verify/frontend/quality",
    "context_pack_version": "platform-docs@2026-03-29",
    "rules": ["platform/root", "platform/sdet", "platform/frontend"],
    "playbooks": ["platform-sdet:test-repos-guide", "platform-sdet:playwright-pom"]
  }
}
```

This keeps runs reproducible without copying large documents into feature state.

### Sync Strategy

Use a snapshot model:

1. `platform-docs` publishes canonical manifests and content.
2. the consuming workspace syncs them into `.aw_rules` and `.aw_registry`
3. `aw-ecc` resolves against the synced local snapshot

This gives you:

- decoupling from live repo layout
- offline/local reproducibility
- deterministic tests
- a single source of truth

### Test Strategy For Decoupling

`aw-ecc` tests should have three levels:

1. contract tests against fixture context packs
2. integration tests against a synced local snapshot
3. live product tests against the actual installed workspace

That way the engine is testable even if `platform-docs` content changes later.

### Bottom Line

Use `platform-docs` as the content source, but make ECC depend only on:

- stable pack IDs
- a manifest schema
- a resolver interface

That is how you use the GHL context deeply while still keeping the system decoupled.
