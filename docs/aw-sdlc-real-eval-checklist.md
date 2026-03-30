# AW SDLC Real Eval Checklist

## Purpose

This checklist defines what a real SDLC example must prove in the isolated-workspace eval suite.

Each example should verify the relevant subset of these points:

1. The correct public AW stage is invoked for the request.
2. The expected feature slug is used.
3. The expected artifact files are created.
4. Forbidden artifacts are not created.
5. `state.json` is written or updated.
6. The artifact itself meets the expected quality bar for that stage.
7. The core user-visible outcome for the stage is present in the artifact content.
8. Local validation evidence is present when the stage requires it.
9. PR governance evidence is present when verification is involved.
10. The PR path is production-ready when a PR outcome is requested.
11. Testing artifacts are recorded when verification or release readiness is involved.
12. GitHub or CI status evidence is recorded when running against a real repo with workflows.
13. The correct GHL staging provider is resolved when deployment is involved.
14. Staging deployment uses the versioned deployment path for the repo archetype.
15. The final outcome or blocker is recorded clearly.

## Real Example Matrix

The current target set is:

1. `plan-technical-spec`
2. `plan-tasks-from-spec`
3. `execute-approved-spec`
4. `execute-docs-only`
5. `verify-pr-governance`
6. `deploy-microservice-staging`
7. `deploy-microfrontend-staging`
8. `deploy-worker-staging`
9. `ship-verified-to-staging`
10. `ship-full-pr-and-staging`

## Checklist by Stage

### Plan

- correct planning mode selected
- correct planning artifact created
- no implementation artifact created
- `state.json` updated
- artifact content reflects the input contract or spec
- artifact quality is strong enough to drive the next stage without guessing

Artifact quality means:

- goals are explicit
- scope and non-goals are clear
- acceptance criteria are testable
- technical details are concrete enough for implementation

### Execute

- correct execution mode selected
- required source or docs change is made
- `execution.md` created
- `state.json` updated
- no release artifact created
- execution artifact clearly explains what changed and what was validated

Artifact quality means:

- implementation notes are concrete
- changed files are named
- blockers and concerns are explicit
- the next stage is unambiguous

### Verify

- `verification.md` created
- `state.json` updated
- local validation evidence recorded
- PR checklist or governance evidence recorded when present
- no release artifact created
- testing artifacts are attached or referenced when the repo produces them
- readiness decision is explicit

Artifact quality means:

- command evidence is real, not inferred
- PR checklist quality is checked
- required findings are clearly separated from summaries
- readiness for PR or staging is stated directly

Testing artifacts can include:

- unit test output
- integration test output
- E2E output
- coverage summary
- links or paths to generated reports

### Deploy

- `release.md` created
- `state.json` updated
- correct provider resolved for the repo archetype
- requested release path or blocker recorded
- no planning artifact reopened
- PR quality is evaluated when a PR path is requested
- versioned staging deployment evidence is captured for staging flows

Artifact quality means:

- release path is explicit
- provider resolution is explicit
- rollback path is present
- real external blocker details are preserved when deploy cannot complete

PR quality means:

- the PR summary is complete
- verification evidence is reflected in the PR description
- the PR looks merge-ready or production-ready, not just syntactically valid

Versioned staging deployment evidence means:

- versioned provider is named
- pipeline family or pipeline path is recorded
- deploy version or version-routing signal is recorded when available
- versioned links are recorded in `release.md`
- deployment build links are recorded in `release.md`
- testing automation build links are recorded in `release.md`
- build status is recorded for each relevant automation entry
- post-deploy smoke or routing evidence is recorded when available

### Ship

- correct minimum stage sequence selected
- expected stage artifacts created
- unnecessary stage artifacts are not recreated
- verification evidence exists before deploy
- release outcome captures the requested PR and/or staging result
- the end-to-end artifact set is coherent enough to hand to another engineer without extra explanation

## Live External Checklist

The isolated-workspace suite proves local workflow behavior.
The following checks must be done in real target repos before calling the SDLC fully production-proven:

1. A real GitHub PR is created successfully in a repo with a valid remote.
2. The PR description contains the expected summary, verification checklist, and evidence references.
3. GitHub checks or CI statuses are read and recorded when the target repo has workflows.
4. Testing artifacts from the real pipeline are linked or recorded.
5. A real versioned staging flow succeeds, or a trusted dry-run equivalent is captured, for:
   - microfrontend
   - microservice
   - worker
6. The release artifact records the exact versioned staging reference, not only a generic “staging passed”.
