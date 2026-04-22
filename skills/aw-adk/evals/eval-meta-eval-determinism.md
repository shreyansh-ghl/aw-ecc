---
name: eval-meta-eval-determinism
target: skill/aw-adk
category: behavioral
difficulty: advanced
---

# Eval: Meta-Eval — Scoring Determinism

## Task

Test that the ADK's scoring produces consistent results. The same artifact scored twice should receive the same tier and similar per-dimension scores. Flaky scoring undermines trust in the entire rubric system.

### Prompt (run twice)

```
Score this skill: .aw/.aw_registry/platform/data/skills/redis-caching-patterns/SKILL.md
```

Run the exact same scoring prompt twice against the same artifact. Compare the two score outputs.

## Context

| Field | Value |
|-------|-------|
| **Target artifact** | any existing skill with stable content |
| **Target type** | `skill` |

## Expected Outcomes

- [ ] **Both runs produce a 10-dimension score table**
- [ ] **Same tier in both runs** — if run 1 is B-Tier, run 2 must also be B-Tier
- [ ] **Per-dimension scores within ±1 point** — a dimension scored 7 in run 1 should be 6-8 in run 2
- [ ] **Total score within ±5 points** — e.g., 72 and 76 is acceptable; 72 and 85 is not
- [ ] **Same improvement suggestions** — the top 3 gaps identified should overlap between runs
- [ ] **Both runs reference rubric-skill.md** — scoring is rubric-based, not ad-hoc

## Grading Criteria

### PASS

- Same tier in both runs
- Total score difference ≤ 5 points
- Per-dimension scores within ±1
- Top 3 improvement suggestions overlap (at least 2 of 3 match)

### PARTIAL

- Same tier but total score difference 6-10 points
- OR different tier but adjacent (B vs C, not B vs D)

### FAIL

- Different tiers separated by 2+ levels (e.g., B-Tier vs D-Tier)
- Total score difference > 10 points
- Improvement suggestions are completely different between runs

## Evaluation Method

**Type:** hybrid

### Deterministic Checks

```bash
# Compare total scores from both runs (requires parsing the output)
# Tier must match exactly
# Total must be within ±5
```

### Model-Based Checks

- Extract the total score from each run's output
- Compare tier assignments
- Compare per-dimension scores
- Compare improvement suggestions for overlap

## Baseline Expectations

- Without ADK: Scoring is ad-hoc, varies wildly between runs (±20+ points).
- With ADK: Rubric-anchored scoring with ≤5 point variance.
- **Expected delta:** 75%+ reduction in score variance
