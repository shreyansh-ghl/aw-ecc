---
name: eval-create-skill
target: skill/aw-adk
category: functional
difficulty: intermediate
---

# Eval: Create Skill — Full Flow Compliance

## Task

Test that the ADK follows all 14 create flow steps when creating a skill. The prompt asks for a realistic skill in a known namespace. The eval checks that no steps are skipped — especially CHECKPOINT, LINT, SCORE, and EVAL GATE, which have historically been dropped for "simpler" artifact types.

### Prompt

```
Create a skill for MongoDB query patterns in the platform/data namespace. It should help developers write performant Mongoose queries — covering index-aware query construction, aggregation pipeline patterns, pagination with cursor-based approaches, and common anti-patterns like unbounded find(). Target audience is backend engineers using NestJS with Mongoose. No scripts or references needed beyond inline examples.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform/data` |
| **Domain** | `data` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `skill` |

## Expected Outcomes

The executor's output must satisfy ALL of the following:

- [ ] **Type classified correctly** — identified as `skill` (not agent, command, or rule)
- [ ] **Interview conducted** — asked at least 3 questions before scaffolding (when to use, what domain knowledge, namespace confirmation)
- [ ] **Path resolved correctly** — target path is `.aw/.aw_registry/platform/data/skills/mongodb-query-patterns/SKILL.md`
- [ ] **SKILL.md created** with frontmatter fields: `name`, `description`, `trigger`
- [ ] **Required sections present** — at minimum: "When to Use", a guide/instructions section, and "References"
- [ ] **CHECKPOINT output shown** — the executor printed remaining steps (LINT → SCORE → EVALS → REGISTRY → SYNC) before continuing
- [ ] **Lint ran** — `lint-artifact.sh` was executed on the created file
- [ ] **Scoring performed** — rubric-skill.md was read and a score table with 10 dimensions was output
- [ ] **Score is B-Tier (60+) minimum** — or the executor iterated to fix gaps
- [ ] **2+ evals created** — colocated at `skills/mongodb-query-patterns/evals/eval-*.md`
- [ ] **Evals cover happy + failure** — at least one eval tests a failure or edge case scenario
- [ ] **`aw link` ran** — sync step was not skipped
- [ ] **No phantom dependencies** — any referenced artifacts actually exist

## Grading Criteria

### PASS (all conditions met)

- All 13 expected outcomes checked
- Content is domain-specific (MongoDB, not generic placeholder)
- Full flow executed in order

### PARTIAL (8+ of 13)

- Artifact created with correct structure
- But some steps skipped (e.g., no checkpoint, no lint, or no evals)

### FAIL (below 8)

- Steps 5-14 skipped entirely (wrote artifact → jumped to "done")
- Wrong type classification
- Wrong filesystem path

## Evaluation Method

**Type:** hybrid

### Deterministic Checks

```bash
# Verify SKILL.md exists at correct path
test -f ".aw/.aw_registry/platform/data/skills/mongodb-query-patterns/SKILL.md" || echo "FAIL: file not found"

# Verify required frontmatter
grep -q "^name:" ".aw/.aw_registry/platform/data/skills/mongodb-query-patterns/SKILL.md" || echo "FAIL: missing name"
grep -q "^trigger:" ".aw/.aw_registry/platform/data/skills/mongodb-query-patterns/SKILL.md" || echo "FAIL: missing trigger"

# Verify evals exist
ls .aw/.aw_registry/platform/data/skills/mongodb-query-patterns/evals/eval-*.md 2>/dev/null | wc -l | grep -q "[2-9]" || echo "FAIL: fewer than 2 evals"

# Run lint
bash ~/.aw-ecc/skills/aw-adk/scripts/lint-artifact.sh ".aw/.aw_registry/platform/data/skills/mongodb-query-patterns/SKILL.md" skill
```

### Model-Based Checks

- Did the executor output a CHECKPOINT before lint/score/eval steps?
- Is the content MongoDB-specific (not generic foo/bar)?
- Does the score table show 10 dimensions with justified scores?

## Baseline Expectations

- Without ADK: Model creates a markdown file but skips lint, scoring, evals, and registry updates. No structured flow.
- With ADK: All 14 steps followed. Structured artifact with colocated evals and correct placement.
- **Expected delta:** +50% step completion rate
