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
