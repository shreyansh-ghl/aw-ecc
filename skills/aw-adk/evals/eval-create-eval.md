---
name: eval-create-eval
target: skill/aw-adk
category: functional
difficulty: intermediate
---

# Eval: Create Eval — Standalone Eval for Existing Artifact

## Task

Test that the ADK can create evals for an existing artifact (not as part of a create flow, but standalone). This tests the eval-specific interview, correct colocated placement, and eval quality (not always-pass, has failure scenarios, discriminating assertions).

### Prompt

```
Create evals for the existing integrity-verifier agent in the revex/reselling namespace (it's at .aw/.aw_registry/revex/reselling/backend/agents/integrity-verifier.md). Create at least 2 evals — one happy path testing successful data integrity verification, and one failure scenario where the agent encounters corrupted or mismatched records. Use hybrid grading (deterministic for structure, model-based for content quality).
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `revex/reselling` |
| **Domain** | `backend` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `eval` |

## Expected Outcomes

- [ ] **Type classified correctly** — identified as `eval`
- [ ] **Interview conducted** — asked about: which parent artifact, what scenarios, what grader type
- [ ] **Parent artifact located** — the ADK reads the existing agent to understand what to test
- [ ] **2+ eval files created** — at `agents/evals/payments-processor/eval-*.md`
- [ ] **Colocated placement** — evals are in the agent's `evals/` directory, not a centralized location
- [ ] **Happy path covered** — at least one eval tests the agent working correctly
- [ ] **Failure scenario covered** — at least one eval tests error handling or edge cases
- [ ] **Eval frontmatter correct** — each eval has `target:`, `type: eval`, `purpose:`
- [ ] **Assertions are discriminating** — at least one negative assertion ("does NOT contain/skip X")
- [ ] **Grading criteria clear** — PASS/PARTIAL/FAIL with specific thresholds
- [ ] **CHECKPOINT output shown**
- [ ] **Lint ran** on the eval files

## Grading Criteria

### PASS (all conditions met)

- All 12 outcomes checked
- Evals are specific to the payments-processor agent (not generic template output)
- At least one negative assertion present

### PARTIAL (8+ of 12)

- Evals created but generic (not tailored to the agent's domain)
- OR placed in wrong directory

### FAIL (below 8)

- No evals created
- Evals placed in centralized location instead of colocated
- All assertions are always-pass (no discriminating checks)

## Evaluation Method

**Type:** hybrid

### Deterministic Checks

```bash
# Verify evals exist at correct colocated path
ls .aw/.aw_registry/revex/reselling/*/agents/evals/payments-processor/eval-*.md 2>/dev/null | wc -l | grep -q "[2-9]" || echo "FAIL: fewer than 2 evals"

# Verify frontmatter
for f in .aw/.aw_registry/revex/reselling/*/agents/evals/payments-processor/eval-*.md; do
  grep -q "^target:" "$f" || echo "FAIL: $f missing target"
done
```

### Model-Based Checks

- Are eval scenarios specific to payments processing (not generic)?
- Do assertions discriminate — would a clearly wrong output fail them?
- Did the executor read the parent agent before writing evals?

## Baseline Expectations

- Without ADK: Generic eval stubs with always-pass assertions, possibly in wrong directory.
- With ADK: Domain-specific evals with discriminating assertions, correctly colocated.
- **Expected delta:** +30% assertion discrimination rate
