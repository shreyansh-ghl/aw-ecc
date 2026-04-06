---
name: security-and-hardening
description: Hardens code and system boundaries against misuse. Use when working with authentication, user input, secrets, external integrations, sensitive data, or any new trust boundary.
origin: ECC
---

# Security And Hardening

## Overview

Security is boundary work.
This skill makes the agent classify trust boundaries, harden them deliberately, and prove the risky paths were reviewed rather than assumed safe.

## When to Use

- adding or changing authentication or authorization
- handling user input, uploads, webhooks, or external API traffic
- working with secrets, tokens, session state, or encryption
- storing or transmitting sensitive or regulated data
- introducing a new integration, endpoint, or background execution path

**When NOT to use**

- purely local changes with no user, network, secret, or boundary impact

## Workflow

1. Classify the boundaries first.
   Identify:
   - external input boundaries
   - authz and identity boundaries
   - data storage boundaries
   - outbound trust boundaries
2. Harden the entry points.
   Validate input, apply authn/authz, enforce tenant or ownership scoping, and reject malformed or over-broad requests early.
3. Protect secrets and configuration.
   Use `references/security-checklist.md`.
   Secrets must stay out of source, logs, screenshots, and error payloads.
4. Reduce abuse and blast radius.
   Add rate limits, safe defaults, least privilege, error handling, and logging that helps operators without leaking sensitive data.
5. Review dependencies and operational posture.
   Check whether packages, headers, storage settings, or integration modes introduce known risk.
6. Prove the risky path was considered.
   Name what was hardened, what remains risky, and what follow-up work is still required.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's internal, so the security bar is lower." | Internal paths still become attack surfaces and privilege boundaries. |
| "The framework handles that automatically." | Framework defaults help, but boundary ownership still belongs to the implementation. |
| "We'll secure it after the happy path works." | Security debt compounds quickly once an interface is already in use. |
| "Nobody will hit that edge case." | Attackers and accidental misuse both live in edge cases. |

## Red Flags

- trust boundaries are unclear or unnamed
- secrets appear in code, logs, or test fixtures
- auth exists without authorization checks
- outbound integrations accept overly broad input or destination control

## Verification

After hardening, confirm:

- [ ] the relevant trust boundaries are explicit
- [ ] input, auth, and secret handling were reviewed deliberately
- [ ] abusive or malformed requests fail safely
- [ ] logs and errors avoid leaking sensitive data
- [ ] remaining security risks or follow-ups are documented
