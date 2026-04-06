# AW ECC Proof Surface

`aw-ecc` should be evaluated by the proof it leaves behind, not only by the size of the catalog or the polish of the README.

This guide pulls the existing proof story into one place:

- deterministic confidence docs
- real-eval expectations
- stage artifact expectations under `.aw_docs/`
- demo paths that show the workflow behaving correctly

Pair this with [aw-ecc-security-posture.md](./aw-ecc-security-posture.md).
Evidence is part of trust, but it is not a substitute for safe runtime boundaries.

## What To Inspect First

The fastest way to judge an AW run is to inspect the stage artifacts:

| Stage | Required proof artifact |
| --- | --- |
| plan | planning artifacts plus `state.json` |
| execute | `execution.md` and `state.json` |
| verify | `verification.md` and `state.json` |
| deploy | `release.md` and `state.json` |

The most important question is not "did it answer nicely?"
It is "did it leave the right deterministic artifact for the next stage to continue without guessing?"

## Where The Confidence Story Lives

The repo already has the confidence model; it was just not easy to discover from onboarding.

Start with these docs:

- [aw-sdlc-confidence-plan.md](./aw-sdlc-confidence-plan.md) for the confidence ladder and release gates
- [aw-sdlc-real-eval-checklist.md](./aw-sdlc-real-eval-checklist.md) for what each real SDLC example must prove
- [aw-sdlc-e2e-plan.md](./aw-sdlc-e2e-plan.md) for the artifact and learning-loop contract

Together they answer three different questions:

- what counts as trustworthy behavior
- what each stage artifact must contain
- how real and deterministic evaluation should validate it

## Three Demo Paths

If you want a small but convincing demo set, use these three paths.

### 1. Feature Flow Demo

Use this when you want to show that AW can move a bounded change forward cleanly.

What to demo:

1. ask for a small approved implementation or docs-only change
2. run it through `/aw:execute`
3. inspect `execution.md`, `state.json`, and the changed files
4. if needed, continue to `/aw:verify` and inspect `verification.md`

What it proves:

- the right stage was chosen
- execution left a usable handoff artifact
- the next stage can continue without reconstructing context

### 2. Repair Loop Demo

Use this when you want to show that AW does not confuse "worked on something" with "ready."

What to demo:

1. present a change that still needs validation or contains a meaningful gap
2. run `/aw:verify`
3. inspect the findings, readiness decision, and repair expectation

What it proves:

- stage boundaries hold
- verification records evidence instead of vague approval
- failing work creates a repair loop instead of silent optimism

### 3. Ship Readiness Demo

Use this when you want to show that AW can carry verified work toward a real release outcome.

What to demo:

1. use a verified change in a configured target repo
2. continue through `/aw:deploy` or `/aw:ship`
3. inspect `release.md` for provider resolution, release path, and real external references

What it proves:

- verify happens before deploy
- repo archetype matters
- release outcomes are recorded concretely instead of being implied

## Confidence Commands Worth Knowing

For the engine repo itself, the confidence story is backed by the existing eval scripts:

```bash
bash tests/evals/run-aw-sdlc-evals.sh deterministic
AW_SDLC_EVAL_REF=WORKTREE AW_SDLC_EVAL_WORKSPACE_MODE=tempdir AW_SDLC_EVAL_PARALLELISM=2 bash tests/evals/run-aw-sdlc-real-parallel.sh
```

Use the deterministic suite to check contract-level behavior.
Use the real parallel suite to validate stage behavior and artifact quality in isolated workspaces.

## What This Repo Can And Cannot Prove Alone

`aw-ecc` can prove:

- stage routing contracts
- deterministic artifact behavior
- isolated workspace outcomes
- confidence expectations for real runs

`aw-ecc` cannot fully prove by itself:

- real PR creation in a target repo with a valid remote
- real CI status collection from a target repo with workflows
- real staging deployment against each configured repo archetype

That final layer has to be demonstrated in real target repos, which is exactly how the confidence plan describes the external-proof requirement.

## Recommended Reading Order

If you only want the smallest proof-first path:

1. read this guide
2. read [aw-ecc-security-posture.md](./aw-ecc-security-posture.md)
3. inspect one real `.aw_docs/features/<feature_slug>/` folder
4. read [aw-sdlc-real-eval-checklist.md](./aw-sdlc-real-eval-checklist.md)
5. use [aw-sdlc-confidence-plan.md](./aw-sdlc-confidence-plan.md) when you need the full trust model
