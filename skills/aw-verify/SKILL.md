---
name: platform-core-aw-verify
description: Evidence-based verification — runs actual commands, captures output, and dispatches 5 parallel code reviewers before declaring success.
trigger: All tasks completed in aw-execute, or user requests verification of implemented work.
---

# AW Verify

## HARD-GATE

> **You MUST run commands and show their output before claiming anything passes.**
> "I believe the tests pass" is not evidence. `npm run test` output showing green is evidence.
> No verification claim is valid without command output proving it.

## Checklist

Run each verification step and capture the output:

1. **Tests Pass** — Run `npm run test` (or equivalent). All tests must pass. Show output.
2. **Types/Lint Pass** — Run `npm run type-check` and `npm run lint` (or equivalents). Zero errors. Show output.
3. **Build Succeeds** — Run `npm run build` (or equivalent). Clean build with no errors. Show output.
4. **5 Parallel Code Reviewers** — Dispatch 5 reviewers simultaneously (see below).
5. **Spec Compliance** — Compare implementation against the spec from `docs/specs/`. Every acceptance criterion must be met.
6. **Platform Rules** — Check all changed files against applicable `.aw_rules`. Zero violations.

## 5 Parallel Code Reviewers

Dispatch these 5 reviewers in parallel. Each reviews ALL changed files from their perspective:

### 1. Security Reviewer
- No hardcoded secrets (API keys, passwords, tokens)
- Input validation on all boundaries
- SQL/NoSQL injection prevention
- XSS prevention (DOMPurify for v-html)
- Auth/authz on all routes
- locationId from JWT only, never from client

### 2. Performance Reviewer
- No N+1 queries
- No `KEYS *` in Redis
- Proper indexing for new queries
- No unbounded list endpoints
- Efficient data structures and algorithms
- No unnecessary re-renders in Vue components

### 3. Architecture Reviewer
- Proper module boundaries (controller -> service -> repository)
- No business logic in controllers
- Single responsibility per file
- Dependency injection used correctly
- No circular dependencies
- Proper layer separation

### 4. Reliability Reviewer
- No empty catch blocks
- Comprehensive error handling at every level
- Graceful shutdown implemented
- Health probes configured
- Retry logic where appropriate
- Idempotency for critical operations

### 5. Maintainability Reviewer
- Files under 400 lines (800 max)
- Functions under 50 lines
- Clear naming that communicates intent
- No deep nesting (>4 levels)
- Tests exist for all new behavior
- Documentation updated for public API changes

## Output Format

Present results as a verification report:

```markdown
## Verification Report

| Check | Status | Evidence |
|---|---|---|
| Tests | PASS | `npm run test` — 47 tests, 0 failures |
| Types | PASS | `npm run type-check` — no errors |
| Lint | PASS | `npm run lint` — no warnings |
| Build | PASS | `npm run build` — compiled successfully |
| Security Review | PASS | No issues found |
| Performance Review | PASS_WITH_NOTES | Note: consider adding index for new query |
| Architecture Review | PASS | Proper module structure |
| Reliability Review | PASS | Error handling comprehensive |
| Maintainability Review | PASS | All files under 400 lines |
| Spec Compliance | PASS | 8/8 acceptance criteria met |
| Platform Rules | PASS | No violations |

**Overall: PASS** (or FAIL — with list of blocking issues)
```

If any check fails, list the specific failures and what needs to be fixed before proceeding.

## Next Skill

> After verification passes, invoke **`aw-finish`** to integrate the verified work.
