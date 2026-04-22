---
name: eval-delete-rule
target: skill/aw-adk
category: functional
difficulty: intermediate
---

# Eval: Delete Rule — Registry Cleanup (Manifest + AGENTS.md)

## Task

Test that the ADK's delete mode for rules removes the reference file AND cleans up both the rule-manifest.json entry and the AGENTS.md bullet. Rules have the most complex cleanup because they touch 3 registry locations.

### Prompt

```
First, create a temporary rule called no-temp-test-pattern for the universal domain. It prevents using temporary test patterns in production code. Severity: SHOULD. WRONG: if (process.env.TEMP_TEST) { skipValidation(); }. RIGHT: remove temp test flags before merging. File patterns: *.ts, *.js. No exceptions.

After the rule is created (including manifest + AGENTS.md updates), delete it using the ADK delete flow. Confirm when prompted.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform` |
| **Domain** | `universal` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `rule` (create then delete) |

## Expected Outcomes

- [ ] **Rule created first** with reference file, manifest entry, AGENTS.md bullet
- [ ] **Delete flow initiated**
- [ ] **Inventory shown** — lists: reference file, manifest entry, AGENTS.md bullet, colocated evals
- [ ] **User confirmation requested**
- [ ] **Reference file deleted**
- [ ] **rule-manifest.json entry removed**
- [ ] **AGENTS.md bullet removed**
- [ ] **Colocated evals deleted**
- [ ] **`aw link` ran** after deletion

## Grading Criteria

### PASS

- All 9 outcomes met
- rule-manifest.json has no trace of the deleted rule
- AGENTS.md has no trace of the deleted rule

### PARTIAL

- Reference file deleted but manifest or AGENTS.md not cleaned up
- OR evals left behind

### FAIL

- Rule not deleted
- Manifest entry left (rule would still appear in enforcement system)
- AGENTS.md bullet left (rule would still be enforced at runtime)

## Evaluation Method

**Type:** deterministic

### Deterministic Checks

```bash
# After delete, verify reference file is gone
find .aw/.aw_rules/platform/universal/references/ -name "*temp-test*" 2>/dev/null | grep -q . && echo "FAIL: reference still exists"

# Verify manifest cleaned
grep -q "temp-test" .aw/.aw_rules/rule-manifest.json 2>/dev/null && echo "FAIL: still in manifest"

# Verify AGENTS.md cleaned
grep -qi "temp.test" .aw/.aw_rules/platform/universal/AGENTS.md 2>/dev/null && echo "FAIL: still in AGENTS.md"

# Verify evals cleaned
find .aw/.aw_rules/platform/universal/ -path "*/evals/*temp-test*" 2>/dev/null | grep -q . && echo "FAIL: eval files remain"
```

## Baseline Expectations

- Without ADK: Reference file deleted manually, manifest and AGENTS.md likely not cleaned — rule remains enforced as a ghost.
- With ADK: Full 3-location cleanup, no ghost rules.
- **Expected delta:** 3/3 cleanup vs. 1/3 without ADK
