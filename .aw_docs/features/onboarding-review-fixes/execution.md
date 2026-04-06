# Execution: Onboarding Review Fixes

## Goal

Resolve the documentation review findings without expanding scope beyond the onboarding and trust docs already added in this worktree.

## Approved Input

- direct user request to fix the review findings
- review evidence identifying machine-specific links in docs and execution artifacts
- review evidence identifying overstated `security-scan` coverage for non-Claude harnesses

## Selected Mode

- `docs`

## Task Loop

1. Replace machine-specific absolute links with repo-relative links in user-facing docs.
2. Replace machine-specific absolute links with repo-relative links in the related execution artifacts.
3. Narrow the AgentShield and `security-scan` wording so the coverage claim matches the actual skill scope.
4. Re-run the docs validation commands and record the outcome.

## Worker Roles

- `implementer`: patched the broken links and the security wording
- `spec_reviewer`: checked the revised wording against `skills/security-scan/SKILL.md`
- `quality_reviewer`: verified the docs remain portable and the evidence files stay consistent

## Files Changed

- [docs/aw-ecc-leverage-patterns.md](../../../docs/aw-ecc-leverage-patterns.md)
- [docs/aw-ecc-security-posture.md](../../../docs/aw-ecc-security-posture.md)
- [small-obvious-path-onboarding/execution.md](../small-obvious-path-onboarding/execution.md)
- [leverage-patterns-bridge/execution.md](../leverage-patterns-bridge/execution.md)
- [install-profile-guidance/execution.md](../install-profile-guidance/execution.md)
- [proof-surface-guide/execution.md](../proof-surface-guide/execution.md)
- [security-posture-guide/execution.md](../security-posture-guide/execution.md)

## What Changed

1. Replaced machine-specific filesystem links with repo-relative links in the onboarding leverage guide.
2. Replaced the same class of links in the related execution records so the branch stays portable for other collaborators.
3. Changed the security posture guide to treat AgentShield as a broad baseline and the repo's `security-scan` workflow as a Claude Code-specific configuration review.

## Validation

- `rg -n '\\]\\(/Users/' docs/aw-ecc-leverage-patterns.md docs/aw-ecc-security-posture.md .aw_docs/features/small-obvious-path-onboarding/execution.md .aw_docs/features/leverage-patterns-bridge/execution.md .aw_docs/features/install-profile-guidance/execution.md .aw_docs/features/proof-surface-guide/execution.md .aw_docs/features/security-posture-guide/execution.md .aw_docs/features/onboarding-review-fixes/execution.md`
- `node scripts/ci/catalog.js --text`
- `npx markdownlint docs/aw-ecc-leverage-patterns.md docs/aw-ecc-security-posture.md .aw_docs/features/small-obvious-path-onboarding/execution.md .aw_docs/features/leverage-patterns-bridge/execution.md .aw_docs/features/install-profile-guidance/execution.md .aw_docs/features/proof-surface-guide/execution.md .aw_docs/features/security-posture-guide/execution.md .aw_docs/features/onboarding-review-fixes/execution.md`
- `git diff --check`

## Handoff

The review findings are fixed and the onboarding/trust docs are portable again.

Recommended next:

- `/aw:review` if you want a quick confirmatory pass
- `/aw:deploy` if you want to commit or prepare a PR for this docs branch
