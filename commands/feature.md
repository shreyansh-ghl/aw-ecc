---
name: aw:feature
description: Master command for guided feature development — 15 phases from requirements to deployment.
argument-hint: "<feature description or 'resume' to continue>"
status: active
stage: feature
internal_skill: aw-feature
---

# Feature

Use `/aw:feature` to develop a feature end-to-end with guided phases.

This command is designed for all users — from PMs to senior engineers. It walks through the full SDLC in 15 clear phases, handling complexity behind the scenes. Every phase is skippable.

## Phases

| # | Phase | What Happens |
|---|---|---|
| 1 | Set up the project | Identify repo from screenshot, clone, install, start dev servers |
| 2 | What do we need? | Gather requirements through structured questions |
| 3 | Write the spec | Generate PRD from requirements |
| 4 | Explore approaches | Brainstorm design options and trade-offs |
| 5 | Technical plan | Create spec + tasks, flag API impact |
| 6 | Write the code | Implement following the task plan |
| 7 | Code review | Run code review agents on changes |
| 8 | Verify it works | Run tests, check coverage |
| 9 | Docs & translations | Update docs, check i18n compliance |
| 10 | Fix issues | Address findings from review/test phases |
| 11 | Production readiness check | Run setup audit checklist |
| 12 | Expert review | Parallel specialist reviews (security, perf, arch) |
| 13 | Fix PR warnings | Auto-detect and fix PR blockers |
| 14 | Deploy to staging | Deploy to staging environment |
| 15 | Go live | Deploy to production |

## Usage

```
/aw:feature Add bulk email scheduling to campaigns
/aw:feature resume
/aw:feature I need to fix the contacts filter
```

## Navigation

- **"skip"** — skip current phase
- **"skip to phase N"** — jump ahead
- **"go to phase N"** — navigate to any phase
- **"show progress"** — see full phase status
- **"where am I?"** — current phase info

## Final Output Shape

- `Route`: aw:feature
- `Feature`: slug
- `Phase`: current phase number and name
- `Completed`: list of completed phases
- `Skipped`: list of skipped phases
- `Progress`: visual progress bar
- `Next`: what happens next or recommended action
