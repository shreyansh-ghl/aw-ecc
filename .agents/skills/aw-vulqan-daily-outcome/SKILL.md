---
name: aw-vulqan-daily-outcome
description: Analyze AW Vulqan PR review mission outcomes from AW Mission runs and GitHub review threads. Use when asked for daily PRV or Vulqan outcome reports, comment resolution trends, fixed-vs-unresolved findings, top issue categories, or mission impact measurement.
trigger: when the user asks to measure AW Vulqan daily impact, PR review outcome trends, fixed comment rates, resolved comment rates, or top issue categories from PRV runs
---

# AW Vulqan Daily Outcome

Turn AW Vulqan PR review activity into an outcome report, not just a run-count report. The goal is to show whether the mission is catching meaningful issues, whether developers act on them, and which categories are creating the most value.

## When to Use

- A user asks for daily, weekly, or last-N-hours AW Vulqan PR review outcomes.
- A user asks whether Vulqan comments were resolved, fixed, ignored, or still open.
- A user asks for top issue categories, severities, repos, PRs, or examples where developers fixed Vulqan findings.
- A user asks to build mission goal-tracking metrics from PR review runs.

## Daily Defaults

- Time window: previous 24 hours in the user's timezone unless they specify a different range.
- Primary author: `aw-vulqan`.
- Legacy authors: track `chatgpt-codex-connector` separately unless the user explicitly asks to merge them.
- Primary unit: inline GitHub review thread comment.
- Secondary units: PR, repo, severity, pattern/category, and AW Mission run.
- Resolution is not the same as fixed. Treat GitHub `isResolved=true` as workflow state, then separately classify fix likelihood.

## Data Sources

Use the most direct available source for each layer:

1. AW Mission run history: Firestore `teamofone_routine_runs`, API export, or existing run-history CSV.
2. PR identity: `triggerContext.repo`, `triggerContext.prNumber`, `triggerContext.htmlUrl`, and run timestamps.
3. GitHub review state: GraphQL `pullRequest.reviewThreads` for `isResolved`, `isOutdated`, comment body, path, line, author, URL, and creation time.
4. Fix evidence: GitHub PR commits and commit file lists after the comment timestamp.

## Workflow

1. Define the window, team, mission/routine IDs, and authors in scope.
2. Load mission runs and dedupe PRs by `repo#prNumber`.
3. Fetch GitHub review threads for each PR. Paginate; do not rely on `gh pr view --comments`.
4. Keep inline comments from the scoped Vulqan author(s) and ignore comments older than the first relevant mission run for that PR.
5. Extract severity and category from the comment body. Prefer explicit `Pattern: <id>` lines; otherwise classify as `unknown`.
6. Classify each comment:
   - `fixed`: mission callback or explicit outcome says fixed.
   - `likely_fixed`: GitHub thread is resolved and either `isOutdated=true` or a later commit touched the same file.
   - `resolved_unverified`: GitHub thread is resolved, but there is no code-change evidence.
   - `possibly_changed_unresolved`: thread is unresolved, but code changed after the comment.
   - `unresolved_open`: thread is unresolved on an open PR.
   - `unresolved_merged`: thread is unresolved on a merged PR.
   - `accepted_risk` / `false_positive`: only when explicit mission outcome or human signal says so.
   - `unknown`: insufficient data or GitHub/API lookup failed.
7. Produce comment-level CSV, PR-level CSV, and a compact markdown report.
8. Highlight the top fixed examples with links and one-line descriptions.

## Fix-Likelihood Rules

```text
resolved != fixed

fixed =
  explicit goalOutcome says fixed

likely_fixed =
  isResolved=true
  AND (isOutdated=true OR same file changed after commentCreatedAt)

resolved_unverified =
  isResolved=true
  AND no outdated/thread-change evidence
  AND no explicit fixed/accepted-risk/false-positive outcome
```

The same-file rule is a pragmatic signal, not semantic proof. A real fix may happen in another file, and a same-file change may not address the finding. Call this out in every report.

## Output Files

Write artifacts under the repo's analysis or artifacts directory with a UTC timestamp:

```text
prv-comment-outcomes-<stamp>.csv
prv-pr-outcomes-<stamp>.csv
prv-daily-outcome-summary-<stamp>.json
prv-daily-outcome-report-<stamp>.md
```

Comment CSV columns:

```text
repo,prNumber,prUrl,prTitle,prState,prMerged,runCount,firstRunAt,lastRunAt,
threadId,isResolved,isOutdated,author,commentCreatedAt,commentUrl,path,line,
severity,category,firstLine,fixStatus,evidence,postCommentCommitsTouchingPath
```

## Report Template

Use [references/report-template.md](references/report-template.md). Keep the final report compact: leadership summary first, evidence tables second, caveats last.

## Quality Bar

- Every count must state its denominator.
- Separate `resolved`, `likely_fixed`, and `fixed`; never collapse them into one metric.
- Include at least five concrete high/critical developer-solved examples when available.
- Keep legacy/parallel bot authors separate unless the user asks for combined totals.
- Include raw artifact paths so the report is auditable.

## References

- [report-template.md](references/report-template.md) — exact daily markdown report shape.
