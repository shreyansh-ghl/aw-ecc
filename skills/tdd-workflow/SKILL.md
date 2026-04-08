---
name: tdd-workflow
description: Use when implementing or fixing observable behavior with fail-first proof. Guides explicit RED -> GREEN -> REFACTOR, risk-based test scope, and repo-specific validation without assuming one framework or blanket coverage target.
origin: ECC
---

# Test-Driven Development Workflow

## Overview

`tdd-workflow` is the portable AW/ECC skill for fail-first implementation.
It is not a framework-specific example pack and it is not a blanket rule that every change needs unit, integration, and E2E coverage all at once.

Use it to drive behavior-changing work through explicit:

- RED proof first
- minimal GREEN implementation second
- REFACTOR only while the same proof stays green

The exact test tools, coverage thresholds, and runtime checks should follow the repo and the risk of the change.

## When to Use

- a feature changes observable behavior
- a bug fix should start from a real failing proof
- a refactor changes live behavior enough that a safety net is needed
- a public contract, API path, or user-visible workflow needs regression protection

## When Not to Use

- the change is docs-only
- the change is pure config, scaffolding, or packaging with no meaningful test-first path
- the behavior is still unclear and needs planning or investigation first

When test-first is not meaningful, use the surrounding build contract instead:
record the best pre-change proof available and the focused post-change validation that will prove the slice.

## Core Rules

1. Write the failing proof before implementation.
   The proof can be a unit test, integration test, reproduction script, contract check, or another deterministic failing signal.
2. Run the exact RED command.
   Do not assume the proof fails for the right reason until you observe it.
3. Make the smallest change that turns RED into GREEN.
   Avoid speculative cleanup, broad abstraction, or adjacent fixes during the GREEN step.
4. Refactor only with the same proof staying green.
   If the proof changes during refactor, you are no longer doing safe TDD.
5. Expand evidence based on risk.
   Unit, integration, browser/runtime, and E2E coverage should be proportional to the changed behavior and the repo's standards.

## Workflow

1. Name the behavior under change.
   State the exact contract, bug, or user-visible outcome that must change.
2. Choose the smallest RED proof.
   Prefer the narrowest deterministic proof that would fail before the change and pass after it.
3. Write the RED proof first.
   Include the exact command that will run it.
4. Run the RED command and capture the failure.
   Confirm the failure matches the intended behavior gap instead of a setup mistake.
5. Implement the smallest GREEN change.
   Change only what is needed to satisfy the failing proof.
6. Run the exact GREEN command.
   Confirm the same proof now passes.
7. Refactor while staying green.
   Use `code-simplification` when the passing implementation is heavier than necessary.
8. Widen validation only as needed.
   Add broader tests or runtime checks when the change crosses boundaries or increases risk.
9. Record the proof trail.
   Keep the RED command, GREEN command, and any broader follow-up evidence visible in the work log or task artifact.

## Choosing Test Scope

| Scope | Use when | Expected proof |
|---|---|---|
| Unit | pure logic or one focused behavior changed | small targeted test |
| Integration | boundaries between modules, APIs, DB, queues, or services changed | contract-level check across the boundary |
| Runtime / browser | DOM, network, rendering, console, or real client behavior matters | browser or runtime proof |
| E2E | critical user flow or release-critical journey changed | end-to-end scenario for the critical path |

Do not force E2E tests for every slice.
Do not skip them when the changed behavior is only trustworthy with end-to-end proof.

## Coverage Guidance

- follow repo thresholds when they already exist
- expand tests around changed behavior and nearby regression risk
- treat coverage numbers as a floor or signal, not the only definition of enough proof
- do not invent a universal target for repos that do not track coverage that way

## Framework and Stack Support

Keep this skill portable.
When stack-specific patterns matter, load the matching testing skill alongside it, for example:

- `python-testing`
- `golang-testing`
- `kotlin-testing`
- `cpp-testing`
- `rust-testing`
- `django-tdd`
- `laravel-tdd`
- `springboot-tdd`
- `e2e-testing`

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I know the fix, so I can add the test after." | Without RED proof first, you do not know the fix actually closes the original gap. |
| "I'll make the design cleaner while I am here." | Extra change during GREEN hides what was actually required to pass. |
| "Unit tests are enough for this UI bug." | Some behavior is only trustworthy with runtime or E2E proof. |
| "Coverage is high, so the safety net is good enough." | Broad coverage can still miss the exact changed behavior. |

## Red Flags

- implementation starts before a RED proof exists
- the RED command is never actually run
- the GREEN step includes unrelated cleanup
- refactor changes the proof target instead of preserving it
- E2E is demanded for every slice regardless of risk
- coverage percentage is treated as a substitute for behavior-specific proof

## Verification

Before leaving the TDD loop, confirm:

- [ ] the changed behavior was named explicitly
- [ ] the RED proof existed before implementation
- [ ] the RED command was run and failed for the right reason
- [ ] the GREEN command was run against the same proof
- [ ] any refactor kept the same proof green
- [ ] broader validation matched the risk of the change
- [ ] repo-specific testing standards or coverage thresholds were respected when applicable

## Final Output Shape

Always end with:

- `Behavior`
- `RED Proof`
- `GREEN Proof`
- `Refactor`
- `Expanded Evidence`
- `Next`
