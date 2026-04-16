---
name: aw:enhance
description: Master command for guided enhancement of existing features — 16 phases from understanding current state to deployment.
argument-hint: "<description of what to enhance or 'resume'>"
status: active
stage: enhance
internal_skill: aw-enhance
---

# Enhance

Use `/aw:enhance` to improve an existing feature end-to-end with guided phases.

Unlike `/aw:feature` (which builds from scratch), `/aw:enhance` starts by understanding what already exists, then plans and builds only the delta. This reduces regressions and preserves working behavior.

## Phases

| # | Phase | What Happens |
|---|---|---|
| 1 | Get set up | Identify repo from screenshot, clone, install, start dev servers |
| 2 | What exists today? | Explore existing code, behavior, tests, and entry points |
| 3 | What needs to change? | Gather enhancement requirements through structured questions |
| 4 | Write what's changing | Generate a delta PRD (current → proposed) |
| 5 | How should we change it? | Brainstorm approaches and trade-offs for the enhancement |
| 6 | Technical plan | Create spec + tasks, flag API/schema impact |
| 7 | Make the changes | Implement incrementally following the task plan |
| 8 | Code review | Run code + product review on changes |
| 9 | Verify nothing broke | Regression-first testing, then new behavior tests |
| 10 | Update documentation | Update docs, check i18n compliance |
| 11 | Fix issues found | Debug and stabilize findings from review/test |
| 12 | Production readiness | Run setup/environment audit checklist |
| 13 | Expert review | Parallel specialist reviews (security, perf, arch) |
| 14 | Fix PR warnings | Auto-detect and fix PR blockers |
| 15 | Deploy to staging | Deploy and provide staging verification link |
| 16 | Go live | Deploy to production and rollout |

## Usage

```
/aw:enhance Improve the contacts filter to support multi-select
/aw:enhance resume
/aw:enhance Add pagination to the existing invoices list
```

## Navigation

- **"skip"** — skip current phase
- **"skip to phase N"** — jump ahead
- **"go to phase N"** — navigate to any phase
- **"show progress"** — see full phase status
- **"where am I?"** — current phase info

## Final Output Shape

- `Route`: aw:enhance
- `Feature`: slug
- `Phase`: current phase number and name
- `Completed`: list of completed phases
- `Skipped`: list of skipped phases
- `Progress`: visual progress bar
- `Next`: what happens next or recommended action
