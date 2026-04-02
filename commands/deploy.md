---
name: aw:deploy
description: Create the right release outcome for verified work, with concrete staging deployment behavior by GHL repo type.
argument-hint: "<verified work, target environment, or release request>"
status: active
stage: deploy
internal_skill: aw-deploy
---

# Deploy

Use `/aw:deploy` to turn verified work into a PR, branch handoff, or deployment outcome.

The current GHL default should focus on:

- PR creation
- branch handoff
- staging deployment

Production can stay profile-gated until the staging flow is proven.

## Role

Convert verified work into the right release outcome: PR, branch handoff, staging deployment, or production deployment.

Default to one release path.
If the user explicitly asks for a compound release flow, run the requested deploy modes in order, usually `pr -> staging`.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `pr` | work should be handed off for review/merge | PR URL, `release.md`, `state.json` |
| `branch` | work should remain on a branch | branch name, `release.md`, `state.json` |
| `staging` | verified work should go to staging | deploy evidence, `release.md`, `state.json` |
| `production` | verified work is ready for production | deploy evidence, `release.md`, `state.json` |

## Required Inputs

- passing verification result
- branch or change set
- relevant release context
- resolved deploy profile when present

## Optional Inputs

- PR template
- deployment pipeline info
- staging environment details

## Outputs

- `.aw_docs/features/<feature_slug>/release.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- release outcome artifact:
  - PR URL
  - branch name
  - staging URL
  - deployment reference
  - versioned deployment links or routing references
  - deployment build links
  - testing automation build links
  - build status summary

## Deploy Layers

| Layer | Responsibility |
|---|---|
| `preflight` | confirm verification passed and the requested path is allowed |
| `release_path` | select PR, branch, staging, or production |
| `pipeline_resolution` | resolve the `ghl-ai` transport plus the concrete versioned staging mechanism for the chosen repo archetype |
| `execution` | perform the release action |
| `post_deploy_evidence` | record build links, testing links, status, URL, health, versioned links, and routing evidence |
| `learning` | save operational learnings and next actions |

## GHL Staging Defaults

When mode is `staging`, resolve the provider by repo archetype:

- microfrontend -> provider `ghl-ai`, mechanism `versioned-mfa-staging`
- microservice -> provider `ghl-ai`, mechanism `versioned-service-staging`
- worker -> provider `ghl-ai`, mechanism `versioned-worker-staging`
- unknown -> fail closed via `unconfigured`

## Hard Gates

- verification must have passed
- destructive release actions must use the selected mode only
- staging deploy must use the configured provider for the repo archetype
- compound release flows are allowed only when they are explicitly requested

## Must Not Do

- must not bypass verification
- must not mix release paths unless explicitly requested
- must not reopen planning during deployment

## Recommended Next Commands

- none required
- optionally `/aw:verify` again after staging if re-validation is needed

## Internal Routing

Deployment should use `aw-deploy` for the primary flow.
Legacy `aw:finish` behavior should be treated as an internal compatibility helper only.

## Final Output Shape

Always end with:

- `Selected Mode`
- `Provider`
- `Resolved Mechanism`
- `Versioned Links`
- `Build Links`
- `Testing Automation Build Links`
- `Build Status`
- `Execution Evidence`
- `Rollback Path`
- `Outcome`
- `Recommended Next`
