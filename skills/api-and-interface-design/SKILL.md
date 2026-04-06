---
name: api-and-interface-design
description: Designs stable APIs and module boundaries. Use when changing public contracts, service interfaces, component props, or any boundary another system or team depends on.
origin: ECC
---

# API and Interface Design

## Overview

Design interfaces that are stable, documented, and hard to misuse.
This applies to REST and GraphQL APIs, TypeScript contracts, event payloads, component props, database-informed boundaries, and service-to-service interfaces.

## When to Use

- designing or changing API endpoints
- defining interfaces between modules, services, or teams
- shaping component props or shared library contracts
- planning data contracts that other code depends on
- changing existing public behavior that consumers may already rely on

**When NOT to use**

- the change is fully internal and does not cross a meaningful boundary
- the work is purely implementation with no contract implications

## Workflow

1. Name the boundary and its consumers first.
   Clarify who consumes the interface and what kind of compatibility risk exists:
   user clients, internal services, frontend callers, workers, or shared packages.
2. Define the contract before the implementation.
   Write the request and response shape, error semantics, idempotency rules, and ordering guarantees before coding the handler.
   Use `references/interface-stability.md` and `api-design` when the surface is HTTP-facing.
3. Treat observable behavior as part of the contract.
   Apply Hyrum's Law thinking:
   if consumers can observe it, they may depend on it.
   Avoid leaking implementation details, inconsistent error patterns, or unstable defaults.
4. Validate at the boundary, not everywhere.
   Validate user input, third-party responses, environment configuration, and external payloads where they enter the system.
   Keep internal code paths simpler once the boundary is trusted.
5. Prefer extension over breaking change.
   Add optional fields, new endpoints, new event versions, or adapters before removing or changing existing semantics.
   If a breaking change is unavoidable, load `deprecation-and-migration`.
6. Record the long-lived design decision.
   For important public or architectural contracts, update docs or ADRs through `documentation-and-adrs`.
   In GHL- or AW-governed repos, align the contract with `.aw_rules`, platform APIs, and baseline expectations.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We can document the contract later." | The contract is the design. If it is unclear now, implementation will drift. |
| "Nobody depends on that behavior." | If it is observable, somebody eventually will. |
| "We can just support two versions forever." | Version sprawl multiplies maintenance and creates dependency pain. |
| "Validation everywhere is safer." | Boundary validation is safer and simpler than repeating checks throughout internal code. |

## Red Flags

- different endpoints or modules expose inconsistent error behavior
- breaking changes are introduced without migration or compatibility planning
- boundary validation is missing for user or third-party input
- implementation details leak into public behavior or naming
- the team cannot explain what part of the behavior is contract versus accident

## Verification

After designing or changing an interface, confirm:

- [ ] the consumers and compatibility surface are explicit
- [ ] the contract exists before or alongside implementation
- [ ] error semantics and validation boundaries are consistent
- [ ] additions were preferred over breaking changes where possible
- [ ] deprecation or migration is planned for any unavoidable break
- [ ] important interface decisions are documented for future engineers and agents
