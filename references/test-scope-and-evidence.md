# Test Scope And Evidence

Use alongside `aw-test`.

## Scope Selection

- `feature`: prove the touched flow works
- `bugfix`: prove the original failure and the regression guard
- `release`: prove the broader ship-ready surface
- `ui-runtime`: prove responsive and browser behavior

## Evidence Expectations

- commands run
- screenshots or runtime notes when UI changed
- failing signal for bugfixes
- unavailable checks called out explicitly

## GHL Baseline Mapping

- local validation -> unit, integration, lint, typecheck, build
- E2E validation -> repo-local or mapped test repo
- external validation -> sandbox smoke, quality gates, downstream checks

## Review Handoff

If findings, PR governance, or release readiness still matter, hand off to `aw-review`.
