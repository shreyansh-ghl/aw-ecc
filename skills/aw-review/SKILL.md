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
3. Run BOTH review engines in parallel (DEFAULT, ALWAYS-ON).
   Both of these must run on every non-trivial review — they are complementary,
   not alternatives. Launch them concurrently:

   **Engine A — Rules-manifest audit** (`aw-rules-review` skill):
   Generates a per-file worksheet driven by `rule-manifest.json`, mapping each
   changed file to applicable platform rules by domain + stack. Invocation:
   - PR: `node ~/.aw/.aw_registry/platform/core/skills/aw-rules-review/scripts/generate-review-template.mjs --pr <number>`
   - branch diff: `... --diff`
   - files: `... --files "<csv>"`
   Output: `.aw_docs/skill-tests/aw-rules-review.md` (worksheet with TODO
   checkboxes per rule per file). Review the worksheet and mark each rule as
   `pass | fail | unknown | not_applicable` with notes on failures/unknowns.

   **Engine B — Parallel multi-reviewer** (`/aw:platform-core-full-review`):
   Runs up to 10 reviewers across 3 conditional waves in parallel:
   - Wave 1 (always): security, performance, architecture, reliability, maintainability
   - Wave 2 (if frontend files): i18n, frontend-code, frontend-security
   - Wave 3 (if UI components): design, architect

   **Merge semantics** — treat Engine A and Engine B findings as independent
   inputs into step 5 (severity classification):
   - Engine A failures become blocking rule-manifest findings
   - Engine B critical findings become blocking reviewer findings
   - Cross-reference: a finding flagged by BOTH engines is high-confidence
     and must be treated as blocking
   - Record both in `state.json` and `verification.md`

   `aw-review` remains the canonical stage contract — both engines feed it;
   aw-review owns severity, governance, and readiness.

   **Single-reviewer fallback** (rare, must be justified):
   Only skip parallel mode when ALL of the following hold:
   - change is < 50 lines AND single file
   - no auth/payment/schema/public-API surface touched
   - risk classification is Low
   - user explicitly requested single-reviewer mode
   When falling back, use the matching language reviewer agent
   (`typescript-reviewer`, `python-reviewer`, `java-reviewer`, `kotlin-reviewer`,
   `go-reviewer`, `rust-reviewer`, `cpp-reviewer`, `flutter-reviewer`)
   or `code-reviewer`. Record the justification in `state.json`.

4. Review across the five core axes.
   Correctness, readability and simplicity, architecture, security, and performance.
   Treat the aggregated findings from parallel execution as the input to severity
   classification (step 5) and governance/readiness (step 7).
   Use `../../references/review-findings-severity.md`.
   For readability and maintainability concerns, load `code-simplification`.
   For public contract or boundary changes, load `api-and-interface-design`.
   For security-sensitive work, load `security-and-hardening` and `../../references/security-checklist.md`.
   For performance-sensitive work, load `performance-optimization` and `../../references/performance-checklist.md`.
   For branch hygiene, save-point quality, or reviewability concerns, load `git-workflow-and-versioning`.
5. Classify findings explicitly.
   Separate blocking findings from advisory notes.
   Name evidence, scope, and required fix.
6. Continue until the requested review scope is covered.
   Do not stop after the first finding or the first review axis if correctness, governance, architecture, security, performance, or readiness checks still remain.
7. Check governance and readiness.
   Confirm PR checklist, approvals, status checks, rollback notes, and release recommendation.
   For architecture or public-behavior changes that need durable rationale, load `documentation-and-adrs`.
8. Request fresh testing when needed.
   If evidence is stale, missing, or too broad, route back to `aw-test` for the smallest targeted rerun.
9. Persist the result.
   Write `verification.md` and update `state.json`.

## Completion Contract

Review is complete only when one of these is true:

- the requested findings, governance, and readiness scope is covered with current evidence
- the work fails review and the repair path is explicit
- a blocker prevents a trustworthy decision and that blocker is named

Every review handoff must make these things obvious:

- which evidence was reviewed
- which reviewer path was used when code review was part of the scope
- which findings are blocking versus advisory
- which governance checks were completed
- what the readiness outcome is
- which exact next command should run next

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
- single-reviewer mode used without meeting ALL fallback criteria
- parallel `/aw:platform-core-full-review` skipped on a non-trivial change
- `aw-rules-review` worksheet skipped (rule-manifest audit is mandatory alongside reviewers)
- only one engine ran when both should have

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "review"`
- `mode`
- `status`
- `review_mode`: `"parallel"` (default) | `"single"` (must include justification)
- `single_mode_justification`: required when `review_mode == "single"`
- `engines_run`: array of engines executed (e.g., `["aw-rules-review", "platform-core-full-review"]`)
- `rules_review_worksheet`: path to the aw-rules-review output (e.g., `.aw_docs/skill-tests/aw-rules-review.md`)
- `rules_review_failures`: count of rule-manifest failures
- `parallel_run_id`: run_id from `/aw:platform-core-full-review` when parallel mode used
- `reviewers_active`: list of reviewer agent slugs that executed
- `waves_executed`: array of wave numbers (e.g., `[1]`, `[1, 2]`, `[1, 2, 3]`)
- `cross_engine_findings`: findings flagged by BOTH engines (high confidence)
- written artifacts
- evidence reviewed
- reviewer agents or reviewer path used
- blocking findings
- advisory notes
- governance status
- readiness outcome
- blockers
- recommended next commands

## Verification

Before leaving review, confirm:

- [ ] test and runtime evidence were reviewed first
- [ ] BOTH engines ran by default: `aw-rules-review` AND `/aw:platform-core-full-review`
- [ ] rules-manifest worksheet was generated and every rule marked pass/fail/unknown/not_applicable
- [ ] cross-engine findings (flagged by both) are elevated to blocking
- [ ] if single-reviewer mode was used, justification meets ALL fallback criteria and is recorded in `state.json`
- [ ] `engines_run`, `rules_review_worksheet`, `parallel_run_id`, `reviewers_active`, and `waves_executed` are recorded
- [ ] findings are explicit, evidence-backed, and severity-tagged
- [ ] reviewer routing is explicit when the scope included concrete code review
- [ ] governance and readiness checks match the resolved baseline
- [ ] repairs point back to build or test with clear scope
- [ ] `verification.md` and `state.json` are updated

## Final Output Shape

Always end with:

- `Mode` (include: `review_mode = parallel | single`, `engines_run = [...]`, `reviewers_active = N`, `waves_executed = [...]`, `parallel_run_id`, `rules_review_worksheet` path)
- `Evidence`
- `Findings`
- `Governance`
- `Readiness`
- `Outcome`
- `Next`
