# CI Quality Gates

Use alongside `aw-test`, `aw-review`, and `aw-deploy`.

## Gate Order

1. unit
2. integration
3. lint
4. typecheck
5. build
6. E2E or runtime smoke
7. external validation or sandbox checks
8. quality gates
9. PR governance

## Rules

- do not convert unavailable into pass
- do not reuse stale CI evidence after relevant code changed
- failing gates should feed back into build or test, not get buried in summary prose

## GHL Notes

- quality gates and PR checklist state are part of release readiness
- versioned staging flows need build links, status, and smoke evidence recorded
