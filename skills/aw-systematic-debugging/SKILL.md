---
name: aw-systematic-debugging
description: Internal bug-fix helper that drives reproduction, root-cause isolation, confirming probes, and fix verification before work is declared complete.
trigger: Internal only. Invoked by aw-execute or aw-verify when a bug, failing test, or uncertain behavior needs structured debugging.
---

# AW Systematic Debugging

## Purpose

`aw-systematic-debugging` is the internal debugging playbook.
It keeps bug work from devolving into guess-and-patch behavior.

## Iron Law

Do not spend repeated fix attempts without new evidence.
If the next action is "try one more change" instead of "run the next probe," debugging has already gone off the rails.

## The Four Phases

### Phase 1: Root Cause Investigation

- capture a reproduction signal
- trace the behavior backward to the smallest plausible fault surface
- inspect surrounding context instead of stopping at the first suspicious line

### Phase 2: Pattern Analysis

- compare failing and working paths
- check whether the failure is isolated or systemic
- identify what changed, what stayed constant, and what assumptions were wrong

### Phase 3: Hypothesis and Testing

- state the current hypothesis explicitly
- run the smallest confirming probe
- change one thing at a time
- update the hypothesis based on the evidence, not intuition

### Phase 4: Implementation

- only implement the fix once the hypothesis is strong enough
- rerun the reproduction and nearby regression checks
- verify the result before claiming success

## Debug Loop

1. capture a reproduction signal
2. define the expected vs actual behavior
3. identify the smallest plausible fault surface
4. run the next confirming probe
5. update the root-cause hypothesis
6. only implement the fix once the hypothesis is strong enough
7. rerun the reproduction and nearby regression checks

## Red Flags

Stop and slow down when:

- this is the third fix attempt for the same issue
- each fix attempt just moves the failure somewhere else
- the patch is growing but the cause is still unclear
- the reproduction no longer exists and the team is guessing from memory

## Required Evidence

Debug output should capture:

- reproduction steps or failing command
- expected behavior
- actual behavior
- current hypothesis
- confirming evidence
- next probe if uncertainty remains

## Hard Gates

- do not jump to fixes before a reproduction or failure signal exists
- do not treat a passing rerun alone as root-cause understanding
- do not hide uncertainty; name the next probe when the cause is still unclear
- do not keep stacking speculative fixes after repeated failed attempts without new evidence

## Final Output Shape

Always end with:

- `Reproduction`
- `Expected vs Actual`
- `Hypothesis`
- `Evidence`
- `Next Probe`
