# AW SDLC Installability Plan

## Goal

Make AW SDLC feel portable and productized across supported harnesses without expanding the public workflow vocabulary.

## Product Boundary

AW SDLC should own:

- stage contracts
- routing behavior
- deterministic artifacts
- repo-profiled verify and deploy behavior

The harness should own:

- tool execution
- sandboxing
- approvals
- background worker runtime

## Near-Term Deliverables

- portable install guidance for the supported harnesses
- repo-relative smoke harnesses instead of workstation-bound scripts
- deterministic eval coverage for installability and productization assumptions
- clear separation between contract ownership and harness ownership

## Supported Install Docs

This branch should ship two concrete install references:

- `.codex/INSTALL.md` for the Codex repo-local reference install
- `docs/aw-sdlc-supported-harnesses.md` for the cross-harness capability map

These docs must describe the same public surface:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`
- `/aw:ship`

## Portable Smoke Bar

Installability is not satisfied by docs alone.
The deterministic suite should keep proving that:

1. repo-local routing wins before global fallback
2. the minimal public surface is stable
3. install docs describe repo-relative behavior
4. command contracts stay thinner than the internal workflow skills
