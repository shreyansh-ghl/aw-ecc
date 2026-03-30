---
name: aw-systematic-debugging
description: Internal bug-fix helper that drives reproduction, root-cause isolation, confirming probes, and fix verification before work is declared complete.
trigger: Internal only. Invoked by aw-execute or aw-verify when a bug, failing test, or uncertain behavior needs structured debugging.
---

# AW Systematic Debugging

## Purpose

`aw-systematic-debugging` is the internal debugging playbook.
It keeps bug work from devolving into guess-and-patch behavior.

## Debug Loop

1. capture a reproduction signal
2. define the expected vs actual behavior
3. identify the smallest plausible fault surface
4. run the next confirming probe
5. update the root-cause hypothesis
6. only implement the fix once the hypothesis is strong enough
7. rerun the reproduction and nearby regression checks

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

## Final Output Shape

Always end with:

- `Reproduction`
- `Expected vs Actual`
- `Hypothesis`
- `Evidence`
- `Next Probe`
