---
name: aw-review
description: Review work for findings, governance, and readiness using explicit severity, org-standard playbooks, and fresh evidence.
trigger: User requests review, readiness, or PR governance, or a legacy verify request resolves to the review stage.
---

# AW Review

## Overview

`aw-review` is now a public stage skill.
It turns evidence into findings, release decisions, and clear next actions.

## When to Use

- the request is findings-oriented review
- PR governance or readiness matters
- the work needs a release recommendation
- a legacy `/aw:verify` request is mostly about review

Do not use as a hidden helper that replaces explicit review intent.

## Workflow

1. Review the evidence first.
   Start with tests, local validation, E2E, runtime proof, and prior investigation artifacts.
2. Load the right org-standard playbooks.
   Pull in platform review, design, accessibility, and quality-gate playbooks from the resolved baseline.
3. Review across the five core axes.
   Correctness, readability and simplicity, architecture, security, and performance.
   Use `../../references/review-findings-severity.md`.
   For readability and maintainability concerns, load `code-simplification`.
   For public contract or boundary changes, load `api-and-interface-design`.
   For security-sensitive work, load `security-and-hardening` and `../../references/security-checklist.md`.
   For performance-sensitive work, load `performance-optimization` and `../../references/performance-checklist.md`.
   For branch hygiene, save-point quality, or reviewability concerns, load `git-workflow-and-versioning`.
4. Classify findings explicitly.
   Separate blocking findings from advisory notes.
   Name evidence, scope, and required fix.
5. Check governance and readiness.
   Confirm PR checklist, approvals, status checks, rollback notes, and release recommendation.
   For architecture or public-behavior changes that need durable rationale, load `documentation-and-adrs`.
6. Request fresh testing when needed.
   If evidence is stale, missing, or too broad, route back to `aw-test` for the smallest targeted rerun.
7. Persist the result.
   Write `verification.md` and update `state.json`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The tests passed, so review is basically done." | Tests are evidence, not the whole decision. |
| "This looks fine overall." | Findings need explicit severity, scope, and evidence. |
| "I can clear the finding from memory." | Resolutions require fresh evidence against the original issue. |

## Red Flags

- no explicit severity language
- PR governance is implied instead of checked
- platform review or design playbooks are skipped for applicable work
- stale test evidence is reused after repairs

## Verification

Before leaving review, confirm:

- [ ] test and runtime evidence were reviewed first
- [ ] findings are explicit, evidence-backed, and severity-tagged
- [ ] governance and readiness checks match the resolved baseline
- [ ] repairs point back to build or test with clear scope
- [ ] `verification.md` and `state.json` are updated
