---
name: aw-deploy
description: Turn reviewed work into one requested release outcome with explicit GHL provider resolution and deterministic release artifacts.
trigger: Test and review passed and the user requests PR creation, branch handoff, or deployment.
---

# AW Deploy

## Overview

`aw-deploy` owns release action only.
It should not reopen planning or implementation.

## When to Use

- reviewed work needs a PR
- reviewed work should remain on a branch
- reviewed work should go to staging or production

Do not use for launch discipline or end-to-end orchestration.

## Workflow

1. Confirm the evidence gate.
   The required QA and review outputs must exist.
2. Select one release path.
   PR, branch, staging, or production.
   **Default deployment environment:** if the user does **not** explicitly name a target (`production`, `prod`, `staging-versions`, green/default/promote, a named cluster/VPN, etc.), assume **`staging`** only. Do not infer production or staging-versions from vague phrases (“deploy”, “ship”, “push it”). Jenkins paths and MCP job folders must use the **`staging/...`** prefix unless an explicit non-staging target is confirmed.
3. Resolve the org-standard mechanism.
   Use the repo archetype and resolved baseline profile to choose provider and mechanism.
   Load `ci-cd-and-automation` for gate ordering, preview/deploy automation, and rollback-aware pipeline expectations.
   For releases that retire or migrate legacy paths, load `deprecation-and-migration`.
4. Execute or record the blocker.
   Complete the selected release action end-to-end for the chosen mode.
   External failure should still yield deterministic `release.md` evidence.
5. Hand off to `aw-ship` when requested.
   Use `aw-ship` for rollout safety, rollback readiness, and closeout.

## Repo routing: Revex membership (`ghl-revex-backend`)

**Hard rule:** If the deployment is from the **`ghl-revex-backend`** repo **and** it targets **membership** workloads (communities, client-portal, courses, `ghl-revex-backend` server/workers, Debezium, ProxySQL, membership workers, etc.), **do not** treat this as a generic `aw-deploy` + **platform-backend** Jenkins path.

**Always** use one of these instead:

- **Cursor command:** `/aw/revex-memberships-infra-deploy` or `/aw/revex-membership-frontend-infra-deploy` (same command surface — argument hint: `staging` / `staging-versions` / `production` + app/worker names; **default env = `staging`** per workflow step 2).
- **Agent path:** the **infra-release-engineer** / membership **deployment** flow that loads **`backend-deployment-skill`** from the registry (e.g. `revex/memberships/infra/skills/backend-deployment-skill/SKILL.md` when `.aw` resolves to the AW registry).

**Jenkins MCP** for that stack is still **`user-ghl-ai`** (`jenkins_trigger-build`, `jenkins_list-jobs`, `jenkins_get-build`, …), but **job paths, `DeploymentOption`, green/default/promote**, and **parameter names** must come from **`backend-deployment-skill`**, not from the `platform-backend` worker job list below.

If the user only said “deploy” without naming the repo, **infer from workspace root / `package.json` / remote** — when it is `ghl-revex-backend`, **hand off** to the command above rather than improvising `staging/revex/...` paths from memory.

## Deploy execution: Jenkins (GHL platform-backend)

Use this section **only** when the repo is **`platform-backend`** (or another app explicitly using `deployments/<env>/workers/` under that monorepo’s Jenkins layout), **not** when [Repo routing: Revex membership](#repo-routing-revex-membership-ghl-revex-backend) applies.

When the resolved mechanism is **Jenkins** (repo has `deployments/<env>/workers/Jenkinsfile*.` pipelines), **execute the deploy**, do not stop at “open Jenkins manually” if the agent session exposes MCP.

### MCP (preferred when available)

- **Server id:** `user-ghl-ai` (Cursor often shows the label **ghl-ai** — if `call_mcp_tool` fails, confirm the server identifier from the project MCP metadata, e.g. `.cursor/projects/<repo>/mcps/user-ghl-ai/SERVER_METADATA.json`, or the Cursor MCP panel.)
- **Tool order (fail-closed discovery):**
  1. `jenkins_list-jobs` with `folder` path segments (e.g. `staging/common/platform-workers`) until you find the **WorkflowJob**, not a folder.
  2. `jenkins_get-build` on the job’s **lastSuccessfulBuild** to learn exact **parameter names** and shapes (boolean params still go in as strings in step 3).
  3. `jenkins_trigger-build` with `action: "trigger"`, full job `path`, and `parameters` as **string key → string value** only (`"true"` / `"false"` for booleans; `SkipBuild` is typically `"Yes"` / `"No"`).
  4. `jenkins_list-builds` (and optionally `jenkins_get-build-log`) to confirm the new build queued / finished — the trigger API may return success while the build is still pending.
- **Local schemas (optional):** Cursor may mirror tool contracts under `.cursor/projects/<workspace>/mcps/user-ghl-ai/tools/*.json` — read before calling if the session does not show tool args inline.

### Common `platform-backend` staging job paths (verify with `jenkins_list-jobs`)

These are the usual umbrellas; **always** confirm in Jenkins for the current folder layout:

- **Events / mixed workers** (`deployments/staging/workers/Jenkinsfile.eventsworker`):  
  `staging/common/platform-workers/platform-events-worker`  
  Worker selection uses **slug parameters** matching the Jenkinsfile list (e.g. `events-worker=true`).
- **Mongo change-stream workers by team** (`deployments/staging/workers/Jenkinsfile.*.mongoEventsWorker`):  
  `staging/common/platform-workers/platform-mongo-events-workers/platform-mongo-events-worker-{automation|crm|leadgen|platform|revex}`  
  Revex flags are **uppercase** boolean params from that Jenkinsfile (e.g. `CLIENTPORTAL_USERS_CONTACTS=true`).

### If MCP is not callable in this session

Record a **clear blocker** in the handoff: UI shows `ghl-ai` enabled but the agent has no `call_mcp_tool` route, or auth denied. Still provide **exact** job path(s), branch parameter, and boolean flags so a human can run the same build in the Jenkins UI.

## Completion Contract

Deploy is complete only when one of these is true:

- the selected release action finished and was recorded clearly
- the release action is blocked and the blocker is recorded clearly

Every deploy handoff must make these things obvious:

- which release mode was selected
- which provider and mechanism were resolved
- what evidence or links were produced
- what rollback path is currently known
- which exact next command should run next

## Common Rationalizations

| Rationalization                           | Reality                                                        |
| ----------------------------------------- | -------------------------------------------------------------- |
| "Deploy can also handle launch closeout." | Release action and launch discipline are related but distinct. |
| "I'll just guess the staging mechanism."  | Unknown deployment config must fail closed.                    |

## Red Flags

- deploy runs without clear test and review evidence
- provider or mechanism is guessed
- deploy silently turns into release orchestration
- environment is assumed to be **production** or **staging-versions** when the user did not state it (default must remain **staging**)

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "deploy"`
- `mode`
- `status`
- written artifacts
- provider
- resolved mechanism
- build or release links
- execution evidence
- rollback path
- `html_companion_artifacts`
- blockers
- recommended next commands

## Human HTML Companion

Markdown `release.md` remains canonical for agents.
When deploy writes or materially updates `release.md`, also create or refresh `.aw_docs/features/<feature_slug>/release.html`. HTML sidecars are required stage outputs, not advisory metadata.

Run `platform-core:echo-direct` with the `release-report` profile.
Invoking `/aw:deploy` in default `dual` mode requires `platform-core:echo-direct` for HTML companion generation; do not skip HTML only because `aw:echo` is unavailable.
Resolve output mode as: explicit user request for Markdown-only -> otherwise `dual`. `.aw_docs/config.json` and `AW_DOCS_OUTPUT_MODE` may request `dual` or `html`, but must not silently suppress required SDLC HTML sidecars.

Pass selected mode, provider, resolved mechanism, release links, execution evidence, rollback path, blockers, and next command as the source bundle.
Record the colocated sidecar in `state.json` `html_companion_artifacts` with `source_path`, `html_path`, profile, status, `runner`, `echo_agent_status`, publish status, and any explicit Markdown-only skip, Echo Direct/HCA provenance, or blocked reason.
Load `platform-core:echo-direct`, let it invoke `platform-core:human-collaboration-artifacts`, and wait for the colocated `.html` sidecar. Do not freehand or command-template HTML outside that skill contract. Record successful Echo Direct execution as `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, `runner: platform-core:echo-direct`, and `echo_agent_status: in_process_fast_path`; do not record successful Echo Direct output as `generated_fallback` or `generated_hca_fallback`. Keep Markdown canonical and include Echo Direct/HCA provenance in the final handoff.

## Verification

- [ ] one release action was selected explicitly
- [ ] provider and mechanism came from repo archetype and baseline resolution
- [ ] `release.md` and `state.json` are updated
- [ ] handoff to `aw-ship` is clear when launch discipline is still needed
- [ ] the HTML companion file exists, or the user explicitly requested Markdown-only

## Echo Direct/HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish commands or publish configuration in this stage. The Echo Direct/HCA handoff owns HTML generation and remote sharing. Before the final response, inspect the Echo Direct/HCA handoff result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute TeamOfOne URLs with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: [spec.html](<absolute repository URL>)` (or another short artifact label) when Echo Direct/HCA returns or records both; never collapse them to bare `TeamOfOne` and `GitHub` labels, hide the TeamOfOne URL behind Markdown-only links, or print long GitHub URLs inline when a compact label can point to the same URL. If Echo Direct/HCA cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Selected Mode`
- `Provider`
- `Resolved Mechanism`
- `Build Links`
- `Execution Evidence`
- `Rollback Path`
- `Outcome`
- `HTML Companion`
- `Remote Docs`
- `Next`
