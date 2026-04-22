---
name: eval-create-rule
target: skill/aw-adk
category: functional
difficulty: intermediate
---

# Eval: Create Rule — Full Flow Including AGENTS.md Update

## Task

Test that the ADK follows the complete rule creation flow — including the three registry updates that rules uniquely require: reference file, rule-manifest.json entry, AND AGENTS.md bullet point. Also tests that rules are not treated as "simpler" than other types — they must go through lint, scoring, and eval creation like any other CASRE type.

### Prompt

```
Create a rule called no-unbounded-cache-ttl for the data domain. It prevents Redis/Memorystore cache keys without expiry — every SET must include EX or PX. Severity: MUST. WRONG: redis.set("user:123", data) with no TTL. RIGHT: redis.set("user:123", data, "EX", 3600). File patterns: *.service.ts, *.repository.ts, *.cache.ts. Exception: distributed locks using Redlock which manage their own TTL internally.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform` (rules are always platform-scoped) |
| **Domain** | `data` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `rule` |

## Expected Outcomes

- [ ] **Type classified correctly** — identified as `rule`
- [ ] **Interview conducted** — asked about: what it prevents, domain, severity, WRONG/RIGHT examples, file patterns, exceptions (6 questions per ADK)
- [ ] **Reference file created** — at `.aw/.aw_rules/platform/data/references/no-unbounded-redis-cache.md` (or similar slug)
- [ ] **Reference has WRONG/RIGHT examples** — concrete, copy-pasteable code (not pseudocode)
- [ ] **Reference has severity and paths frontmatter** — `severity: MUST`, `paths:` with relevant globs
- [ ] **CHECKPOINT output shown** — remaining steps printed before continuing
- [ ] **Lint ran** — `lint-artifact.sh` executed on the rule file
- [ ] **Scoring performed** — rubric-rule.md read, 10-dimension score table output
- [ ] **2+ evals created** — for the rule itself
- [ ] **rule-manifest.json updated** — new entry with id, severity, domains, rule path, description, principle
- [ ] **AGENTS.md bullet added** — `.aw/.aw_rules/platform/data/AGENTS.md` has a new bullet in the Always/Never section AND a reference link
- [ ] **`aw link` ran** (or acknowledged that rules don't need `aw link` — they're live immediately via hook)

## Grading Criteria

### PASS (all conditions met)

- All 12 outcomes checked
- Rule went through full lint/score/eval flow (not treated as "just a doc")
- All three registry updates performed (reference + manifest + AGENTS.md)

### PARTIAL (8+ of 12)

- Rule created with correct structure
- But some flow steps skipped (no lint, no score, or no evals)
- OR manifest updated but AGENTS.md bullet missing

### FAIL (below 8)

- Skipped directly from scaffold to "done" (steps 5-14 dropped)
- No AGENTS.md update (rule would never be enforced at runtime)
- No WRONG/RIGHT examples in the rule

## Evaluation Method

**Type:** hybrid

### Deterministic Checks

```bash
# Verify reference file exists
find .aw/.aw_rules/platform/data/references/ -name "*redis*" -o -name "*cache*" | head -1 | xargs test -f || echo "FAIL: rule reference not found"

# Verify WRONG/RIGHT examples
grep -qi "WRONG\|Never" "<rule-path>" || echo "FAIL: no WRONG examples"
grep -qi "RIGHT\|Always" "<rule-path>" || echo "FAIL: no RIGHT examples"

# Verify manifest entry
grep -q "unbounded" .aw/.aw_rules/rule-manifest.json || echo "FAIL: not in manifest"

# Verify AGENTS.md bullet
grep -qi "redis\|cache\|unbounded" .aw/.aw_rules/platform/data/AGENTS.md || echo "FAIL: not in AGENTS.md"

# Run lint
bash ~/.aw-ecc/skills/aw-adk/scripts/lint-artifact.sh "<rule-path>" rule
```

### Model-Based Checks

- Did the executor show a CHECKPOINT step (not skip straight to writing)?
- Are WRONG/RIGHT examples concrete Redis code (not generic placeholders)?
- Does the score table show 10 dimensions?
- Did the executor create evals for the rule?

## Baseline Expectations

- Without ADK: Rule reference created, maybe manifest updated, but AGENTS.md bullet missing (rule never enforced). No lint, no score, no evals.
- With ADK: Full three-update flow, lint-validated, scored, with colocated evals.
- **Expected delta:** 3/3 registry updates vs. 1-2/3 without ADK
