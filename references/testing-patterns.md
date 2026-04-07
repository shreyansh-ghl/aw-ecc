# Testing Patterns

Use alongside `aw-build` and `aw-test`.

## Core Rules

- Prefer failure-first proof for behavioral changes.
- Keep test names behavior-focused.
- Mock boundaries, not business logic.
- Add the smallest regression guard that would have caught the bug.

## Recommended Order

1. unit
2. integration
3. lint
4. typecheck
5. build
6. targeted E2E or runtime validation

## GHL Notes

- Frontend work often needs HighRise-aware runtime proof, not just unit tests.
- MFA and shell-driven UI changes may need versioned runtime smoke or test-repo validation.
- Service and worker changes should prefer targeted integration proof when the repo supports it.

## Evidence Format

- failing signal
- checks run
- pass/fail result
- unavailable checks
- regression guard added
