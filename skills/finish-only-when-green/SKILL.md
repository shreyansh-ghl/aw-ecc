---
name: finish-only-when-green
description: Use when the user says continue until done, do not stop early, loop until all tests pass, or wants artifact-based completion for package, release, setup, or validation workflows. Enforces an explicit done contract, repeated fix-and-rerun loops, blocker-only pauses, and a final proof artifact before claiming completion.
---

# Finish Only When Green

Use this skill when the user wants persistent execution until the work is actually complete, especially for:
- release validation
- package publishing
- fresh environment setup
- end-to-end CLI smoke testing
- regression fixing loops
- “don’t stop until it’s done” requests

## Core Rule

Do not stop at a status update if the explicit completion gates are not green.

Do not silently downgrade or replace the top-level completion contract mid-run.
If the final release gate is red, then the task is still red even if many sub-checks are green.

Do not enter the fix-and-rerun loop until `green` is defined clearly enough to be testable.

If the task has ambiguous success criteria, first tighten the goal, define the gates, and identify the proof artifact.

Only pause when one of these is true:
- a real external blocker exists
- credentials, permissions, or network access are missing
- the user must choose between materially different outcomes

Otherwise, continue the loop yourself.

## Required Workflow

### 1. Define Green First

Before substantial work, write down the exact completion contract in 3-6 bullets.

Use concrete gates such as:
- package published
- fresh workspace created
- init command succeeded
- Cursor/Codex/Claude smoke passed
- summary artifact written

If there is no proof artifact, the task is not done.

Prefer one final source-of-truth artifact whenever possible:
- `summary.json`
- `summary.txt`
- release-gate report

Do not substitute a collection of scattered green artifacts for the final gate unless the user explicitly changes the contract.

The definition of green must be:
- observable
- specific
- scoped
- rerunnable
- tied to one or more artifacts or commands

Bad:
- "works"
- "looks good"
- "mostly done"
- "migration seems safe"

Good:
- `npm run test:e2e:staging -- --grep @CONVERSATIONS_V2` passes
- visual diff report exists and is within threshold
- summary JSON says `GREEN`

### 2. Ask Sharp Questions Before Looping

If the user has not defined green well enough, ask the smallest set of questions needed before entering the loop.

Ask at most 1-3 short, high-value questions.

Good question types:
- Which environment is the source of truth: local, staging, or production-like?
- What exact flows are in scope for green, and what is explicitly out of scope?
- What proof artifact should exist at the end?
- Should visual checks be exact pixel match, perceptual tolerance, or layout-contract based?
- Are we blocking on all tests, only tagged tests, or only a specific suite?

Do not ask broad or deferring questions like:
- "What do you want me to do?"
- "How should I proceed?"
- "Anything else?"

If you can make a safe default assumption, do so and state it before starting the loop.

### 3. Write the Done Contract Down

Before the loop starts, write down:
- the goal
- the exact green state
- the commands or checks that prove it
- the proof artifact path
- what is still red at the start

If this is missing, the loop has not started yet.

### 4. Work in a Green Loop

Run this loop until all gates pass:
1. execute the next highest-value check
2. inspect the failure precisely
3. patch the smallest correct fix
4. rerun the affected check
5. rerun the full gate when needed

Do not keep re-running the same broken step without changing anything.

### 5. Prefer Narrow Reruns, Then Full Confirmation

After a fix:
- rerun the failing case first
- once it passes, rerun the broader suite that proves the whole contract

Do not stop after targeted reruns if the top-level suite has not been rerun successfully.

### 6. Report Progress Without Pretending Done

Intermediary updates should say:
- what gate is green
- what gate is still red
- what you are doing next

Do not frame “partially working” as complete.

Every substantial status update should include one explicit overall state line:
- `Overall state: GREEN`
- `Overall state: RED`

If any required gate is red, the overall state is red.

### 7. End With Proof

A task is complete only when you can point to the final proof artifact, for example:
- `summary.json`
- `summary.txt`
- published package version
- init log
- smoke verdict files

## Default Completion Template

When the user has not given exact gates, use:
- explicit goal statement written down
- exact green state written down
- implementation or config change applied
- focused verification passed
- broader workflow rerun passed
- final artifact saved

## Green State Template

Use this template at the start of the task whenever green is not already explicit:

- Goal:
- Green means:
- Required checks:
- Proof artifact:
- Initial red gates:

## Pre-Loop Checklist

Before entering the loop, confirm:
- the success criteria are concrete
- the scope is bounded
- the proving command or commands are known
- the proof artifact is known
- any unclear tradeoff has been resolved or safely assumed

If one of these is missing, clarify first.

## Packaging / E2E Variant

For package or release workflows, default gates are:
- package version created or published
- fresh isolated init succeeded
- local init succeeded
- real harness smoke passed for the required CLIs
- final summary artifact exists and is green

Preferred execution order:
1. fix contract drift
2. fix generated artifact drift
3. fix narrow harness/case failures
4. rerun aggregated release gate
5. publish only after the aggregated release gate is green

For migration or regression programs, default gates are:
- scope inventory exists
- machine-readable coverage or gate file exists
- high-priority gaps are identified
- targeted regression suite passes
- differential or comparison checks pass if required
- final summary artifact exists and is green

## Ralph Loop Additions

Borrow these behaviors from Ralph Loop when the work is release-critical, verification-heavy, or prone to false positives.

### 1. One Red Gate Per Iteration

At any given moment, choose one primary red gate.

Examples:
- `hook-contracts` is red
- `cursor-generated-output` is red
- `published-package-init` is red
- `claude:review-security-risk` is red
- `release-gate summary artifact` is red

Use that gate to drive the next fix. Do not chase multiple unclear failures at once unless they are truly independent.

### 2. Fresh-Context Iterations

After each meaningful fix, restate the current state from fresh evidence:
- what is green
- what is still red
- what exact artifact is missing or failing

Do not let stale assumptions from earlier attempts drive the next step.

### 3. Backpressure Through the Top-Level Gate

Use narrow reruns for diagnosis, but keep pressure on the top-level gate that proves completion.

If the final gate is still red, the workflow is still red.

### 4. Artifact-Only Exit

A loop iteration may look successful, but the workflow is not complete until the chosen final artifact says green.

Examples:
- release summary says all gates passed
- final smoke summary includes all required harnesses and all required cases
- package validation report is fully green

### 5. Explicit Contract Changes Only

If you discover a better proving method mid-run:
- explicitly restate the updated contract
- explain why the old one is insufficient
- then continue

Do not quietly switch from a strict gate to a weaker gate.

## Anti-Patterns

Do not:
- enter an infinite loop without first defining what exits the loop
- confuse activity with progress when green is vague
- claim coverage is complete without a written scope inventory
- stop after the first success if later gates remain red
- stop after publishing if install/init/smoke is still unverified
- stop after one harness passes if the release gate requires all harnesses
- claim success from memory when the latest rerun is missing
- replace the final release gate with a weaker ad hoc check set without explicitly updating the contract
- say “mostly green” when the final summary artifact is missing or still red
- leave a known red gate for later if you still have a clear next step and the user asked you to continue until done
