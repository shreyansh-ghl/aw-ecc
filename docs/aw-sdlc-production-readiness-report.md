# AW SDLC Production Readiness Report

Date: 2026-03-31

## Executive Summary

The AW SDLC workflow in `aw-ecc` is getting strong, but it is not yet honest to
call it fully production-ready for broad developer rollout.

What is already strong:

- deterministic contract coverage is green
- intent-first stage coverage is broad
- real isolated-workspace artifact coverage exists
- live release artifact capture and validation now exist
- skill-trigger coverage for public stages plus supporting platform skills now exists
- production `ghl-ai` Jenkins triggering is working for the Communities MFA path

What is still missing for a true "it just works" rollout:

- one fully completed live PR-plus-staging golden path with all exact external links in one artifact
- a clean `git-worktree` real-suite run
- stable live routing and behavior runs without hangs
- confirmed live versioned staging links, not only inferred CDN patterns

## Scorecard

| Area | Status | Current Evidence | Blocking Gap |
|---|---|---|---|
| Public command contracts | green | deterministic suite green | none in current deterministic coverage |
| Intent-first public routing | green in deterministic, partial in live | Communities prompt pack + routing eval coverage | live suite still needs stable completion |
| Primary stage skill mapping | green | command/skill mapping tests green | none in deterministic coverage |
| Supporting platform skill selection | green in deterministic, partial in live | shared skill-trigger case matrix + shell harness + coverage test | no strong live proof yet that every CLI surfaces the exact supporting skills consistently |
| Real local artifact creation | green in tempdir, blocked in git-worktree | 10-case real suite exists in tempdir; targeted worktree repros are now narrowed | detached git-worktree execution still returns without required artifacts after two hardening attempts |
| Live release artifact structure | green | generator + validator + Communities live artifact | current example is deploy-only and still in-progress |
| Real Jenkins trigger | green for Communities MFA trigger | queue URL + build URL captured for `communities-builder=true` | final build readback remains flaky |
| Real PR creation | red | no fully captured golden-path artifact yet | missing real PR URL in the same end-to-end release artifact |
| Real versioned staging link | amber | versioned link pattern is documented and captured | current Communities link is still inferred, not confirmed by live readback |
| Real testing automation link | amber | validator and artifact sections exist | current deploy artifact uses build URL as the testing URL placeholder for deploy-only evidence |
| Rollout readiness for all developers | red | confidence plan exists | live PR + staging + testing evidence still incomplete |

## What Is Green Today

### Deterministic Coverage

- `bash tests/evals/run-aw-sdlc-evals.sh deterministic`
- current result: `80/80` passing

This now includes:

- command contracts
- stage mapping
- quality checks
- Communities prompt coverage
- live release artifact contract checks
- live release generator checks
- BDD coverage
- skill-trigger coverage

### Live Release Artifact Capture

The workflow now has a repeatable way to turn external evidence into a
validated `release.md`:

- generator: `tests/evals/generate-aw-sdlc-live-release.js`
- validator: `tests/evals/aw-sdlc-live-artifacts.test.js`

### Supporting Skill Coverage

The system now has a shared case matrix for public stage + supporting skill
selection:

- cases: `skills/using-aw-skills/tests/skill-trigger-cases.tsv`
- harness: `skills/using-aw-skills/tests/test-skill-triggers.sh`
- deterministic guard: `tests/evals/aw-sdlc-skill-trigger-coverage.test.js`

## What Is Only Partially Proven

### Communities Live Deploy Evidence

Current real evidence captured:

- Jenkins queue URL:
  - `https://jenkins.msgsndr.net/queue/item/6348566/`
- Jenkins build URL:
  - `https://jenkins.msgsndr.net/job/staging-versions/job/revex/job/ghl-revex-frontend/10965/`
- route parameter confirmed:
  - `communities-builder=true`

Current generated artifact:

- `tests/results/live-release-communities-20260331/release.md`

Important limitation:

- the current versioned `remoteEntry.js` link in that artifact is inferred from
  the documented CDN pattern, not confirmed from a live readback

### Live Routing

The live routing suite still needs a stable, fully completed run. Current
evidence shows at least one live route (`explicit-plan`) passing, but the suite
is not yet stable enough to claim fully green live behavior.

### Git-Worktree Repro

The detached worktree issue is now narrowed more precisely.

Observed behavior:

- targeted repros do fail in `git-worktree` mode within a bounded timeout
- the failure is not only a generic hang
- Codex output shows repository exploration and search activity, but the
  expected stage artifact is never written

Examples:

- `execute-approved-spec` -> missing `execution.md`
- `verify-pr-governance` -> missing `verification.md`

This means the current blocker is closer to "stage execution does not complete
in the detached worktree harness" than "the process freezes with no signal at
all".

## Blockers Before Broad Rollout

1. Capture one real PR-plus-staging golden path artifact with:
   - GitHub PR URL
   - Jenkins queue URL
   - Jenkins build URL
   - testing automation URL
   - final build status
   - confirmed versioned staging link
2. Resolve or redesign the detached `git-worktree` execution path.
3. Stabilize the live routing and behavior suite so it completes reliably.
4. Replace inferred versioned links with confirmed live links for the golden path.

## Rollout Recommendation

Recommended now:

- continue using this as an advanced internal pilot
- keep improving live evidence capture and worktree stability
- use the confidence plan and live artifact validator as the rollout bar

Not recommended yet:

- declaring the AW SDLC fully production-ready for every developer
- claiming true end-to-end automation is complete

## Next Best Move

The highest-value next step is:

1. create a real PR in a live target repo
2. trigger staging from that verified change
3. capture all exact external links into one `release.md`
4. rerun `live-artifacts` with completion gates enabled
