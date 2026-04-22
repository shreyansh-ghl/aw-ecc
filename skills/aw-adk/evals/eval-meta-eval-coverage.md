---
name: eval-meta-eval-coverage
target: skill/aw-adk
category: structural
difficulty: intermediate
---

# Eval: Meta-Eval — Scenario Coverage

## Task

Test that evals created by the ADK cover both happy path AND failure scenarios — not just happy-path-only. The ADK's eval gate requires "happy path + at least one failure scenario." This meta-eval verifies that requirement is actually met.

### Prompt

```
Create a skill for Redis caching patterns in the platform/data namespace.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform/data` |
| **Domain** | `data` |
| **Target artifact** | evals created by ADK during skill creation |
| **Target type** | `eval` (meta) |

## Expected Outcomes

- [ ] **Skill created** with 2+ colocated evals
- [ ] **At least one happy-path eval** — tests the skill working correctly with valid input
- [ ] **At least one failure-scenario eval** — tests error handling, edge cases, or invalid input
- [ ] **Failure eval is not just "minimal input"** — it tests a genuinely different scenario (not the happy path with fewer words)
- [ ] **Eval purposes are distinct** — the two evals test meaningfully different aspects, not the same scenario with different wording
- [ ] **Each eval has PASS/FAIL criteria** that are independently verifiable

## Grading Criteria

### PASS

- 2+ evals exist
- At least one is clearly a failure/edge-case scenario (not a relabeled happy path)
- Each has distinct, verifiable pass/fail criteria

### PARTIAL

- 2+ evals exist but both are variations of happy path
- OR only 1 eval created

### FAIL

- No evals created
- OR all evals test the same scenario

## Evaluation Method

**Type:** hybrid

### Deterministic Checks

```bash
# Verify 2+ eval files
EVAL_COUNT=$(ls .aw/.aw_registry/platform/data/skills/redis-caching-patterns/evals/eval-*.md 2>/dev/null | wc -l)
[[ "$EVAL_COUNT" -ge 2 ]] || echo "FAIL: fewer than 2 evals"
```

### Model-Based Checks

- Read each eval's scenario: are they testing genuinely different cases?
- Does at least one eval describe a failure condition (invalid input, missing data, error state)?
- Would a broken skill pass all evals? (If yes → insufficient coverage)

## Baseline Expectations

- Without ADK: Single happy-path eval or no evals at all.
- With ADK: 2+ evals with distinct scenarios covering happy path and failure.
- **Expected delta:** 100% coverage of both paths with ADK
