---
name: platform-core-aw-finish
description: Integrates verified work — creates PR, merges, deploys, or stages. Saves learnings for future sessions.
trigger: aw-verify has passed, or user requests integration of completed work.
---

# AW Finish

## HARD-GATE

> **`aw-verify` must have passed before this skill runs.**
> If verification failed, go back and fix the issues first. Do not skip verification.

## Integration Options

Present these options to the user and execute the chosen one:

### Option 1: Create PR

Create a pull request with the full context:

```markdown
## Summary
- Spec: docs/specs/YYYY-MM-DD-<topic>.md
- Plan: docs/plans/YYYY-MM-DD-<feature>.md

## Changes
<bullet list of what was implemented>

## Verification
- Tests: PASS (N tests, 0 failures)
- Types: PASS
- Lint: PASS
- Build: PASS
- Code Review: 5/5 reviewers passed

## Test Plan
- [ ] <manual verification step 1>
- [ ] <manual verification step 2>
- [ ] <manual verification step 3>
```

### Option 2: Merge to Main

- Ensure PR is approved (or create and auto-merge if allowed).
- Rebase onto latest main before merging.
- Verify CI passes after merge.

### Option 3: Stage for Deploy

- Push to staging branch or trigger staging deployment via Jenkins.
- Provide staging URL and verification steps.

### Option 4: Keep as Branch

- Push branch to remote with `-u` flag.
- Report branch name for later review.

### Option 5: Cleanup

- Remove temporary files, spec drafts, or plan docs if no longer needed.
- Ensure working directory is clean.

## PR Template

When creating a PR, use this structure:

```
gh pr create --title "<type>: <short description>" --body "$(cat <<'EOF'
## Summary
- **Spec:** [docs/specs/YYYY-MM-DD-<topic>.md](link)
- **Plan:** [docs/plans/YYYY-MM-DD-<feature>.md](link)

<1-3 bullet points describing the changes>

## Verification Report
| Check | Status |
|---|---|
| Tests | PASS |
| Types | PASS |
| Build | PASS |
| Code Review | 5/5 PASS |
| Spec Compliance | PASS |

## Test Plan
- [ ] Verify <scenario 1>
- [ ] Verify <scenario 2>
- [ ] Verify <scenario 3>
EOF
)"
```

## Summary Format

After integration, present a summary:

```markdown
## Completed

**Feature:** <feature name>
**Branch:** <branch name>
**PR:** <PR URL or "N/A">
**Status:** <merged / PR created / staged / branch pushed>

### What was built
- <bullet 1>
- <bullet 2>

### Files changed
- `path/to/file1.ts` (created)
- `path/to/file2.ts` (modified)

### Learnings saved
- <learning 1>
- <learning 2>
```

## Save Learnings

After completing the workflow, save learnings for future sessions:

1. **Append to learnings file** — Write to `.aw_docs/learnings/<agent-slug>.md` with:
   - What worked well
   - What was tricky or unexpected
   - Patterns discovered
   - Platform rules that were relevant

2. **Sync queue** — Append to `.aw_docs/learnings/_pending-sync.jsonl` for MCP sync.

3. **MCP store** — Call `memory/store` with the learning context (eager, non-blocking).
