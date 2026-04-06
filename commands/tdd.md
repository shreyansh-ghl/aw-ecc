---
name: aw:tdd
description: Compatibility alias for aw:build in code mode when the user wants test-driven implementation.
argument-hint: "<approved implementation task>"
status: alias
stage: build
aliases-to: aw:build
---

# TDD

`/aw:tdd` is a compatibility alias.

The canonical implementation surface is `/aw:build`, which may run in code mode using a TDD-oriented workflow when appropriate.

See:

- `commands/build.md` for the public build contract
- `skills/aw-build/SKILL.md` for the canonical build-stage behavior
- `references/testing-patterns.md` for failure-first and TDD guidance
