---
name: eval-colocated-placement
target: skill/aw-adk
category: structural
difficulty: basic
---

# Eval: Colocated Placement — Evals Land in Correct Directory

## Task

Test that the ADK places evals in the correct colocated directory for each artifact type. Each CASRE type has a different eval placement pattern. This eval creates an artifact and checks that its evals end up in the right location — not in a centralized `evals/` directory.

### Prompt

```
Create an agent for API rate limiting in the platform/services namespace. It should enforce per-tenant rate limits on HTTP endpoints using sliding window counters in Redis. Tools: Read, Bash, Grep, Glob. Model: sonnet. No existing skills to reference — use skills: [].
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform/services` |
| **Domain** | `services` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `agent` |

## Expected Outcomes

- [ ] **Agent created** at `.aw/.aw_registry/platform/services/agents/api-rate-limiter.md` (or similar slug)
- [ ] **Evals created** at `.aw/.aw_registry/platform/services/agents/evals/api-rate-limiter/eval-*.md`
- [ ] **NOT placed** at a top-level `evals/` directory
- [ ] **NOT placed** at `.aw/.aw_registry/platform/services/evals/` (wrong nesting)
- [ ] **Each eval has `target:` frontmatter** referencing the parent agent
- [ ] **At least 2 eval files** created

## Grading Criteria

### PASS

- Evals are in the correct colocated path: `agents/evals/<slug>/eval-*.md`
- 2+ eval files exist
- All have correct `target:` frontmatter

### PARTIAL

- Evals created but in a slightly wrong path (e.g., `agents/evals/eval-*.md` without the slug subdirectory)

### FAIL

- Evals in a centralized location
- No evals created
- Evals reference wrong parent artifact

## Evaluation Method

**Type:** deterministic

### Deterministic Checks

```bash
# Find the agent file
AGENT_PATH=$(find .aw/.aw_registry/platform/services/agents/ -name "*rate-limit*" -not -path "*/evals/*" | head -1)
SLUG=$(basename "$AGENT_PATH" .md)

# Verify evals are colocated
EVAL_COUNT=$(ls .aw/.aw_registry/platform/services/agents/evals/$SLUG/eval-*.md 2>/dev/null | wc -l)
[[ "$EVAL_COUNT" -ge 2 ]] || echo "FAIL: expected 2+ evals at agents/evals/$SLUG/, found $EVAL_COUNT"

# Verify no centralized placement
ls .aw/.aw_registry/platform/services/evals/ 2>/dev/null && echo "WARN: centralized evals/ exists"

# Verify target frontmatter
for f in .aw/.aw_registry/platform/services/agents/evals/$SLUG/eval-*.md; do
  grep -q "^target:" "$f" || echo "FAIL: $f missing target frontmatter"
done
```

## Baseline Expectations

- Without ADK: Evals placed arbitrarily or not created at all.
- With ADK: Correct colocated placement per eval-placement-guide.md.
- **Expected delta:** 100% correct placement with ADK
