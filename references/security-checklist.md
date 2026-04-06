# Security Checklist

Use when `security-and-hardening`, `aw-review`, `aw-build`, or security-sensitive domain skills apply.

## Boundary Review

- identify every trust boundary touched by the change
- classify which inputs are user-controlled, partner-controlled, or internal-only
- confirm authn and authz are both addressed where needed
- verify tenant, account, or ownership scoping is explicit

## Input And Data Handling

- validate shape, size, and allowed values at the boundary
- reject malformed input early
- treat uploaded files, URLs, headers, and webhook payloads as hostile by default
- avoid returning sensitive internal details in errors

## Secrets And Configuration

- secrets come from environment or secret-management systems, never source
- logs, screenshots, fixtures, and samples do not leak tokens or credentials
- least-privilege permissions are used for integrations and service accounts
- security-sensitive defaults fail closed

## Dependency And Platform Checks

- review new dependencies for necessity and maintenance posture
- check for known vulnerable packages when the change introduces risk
- apply secure headers, storage settings, and transport settings where relevant
- verify external destinations and callback paths are controlled

## Abuse And Blast Radius

- rate limits or abuse controls exist for expensive or high-risk endpoints
- retries and fallback behavior do not amplify failure or duplicate writes
- dangerous actions require explicit authorization and scoped access
- logging supports investigation without exposing secrets

## Evidence

- note what boundary was hardened
- note what was intentionally not changed
- record any remaining risk or required follow-up work
