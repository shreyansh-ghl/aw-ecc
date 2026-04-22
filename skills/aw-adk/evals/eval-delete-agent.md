---
name: eval-delete-agent
target: skill/aw-adk
category: functional
difficulty: intermediate
---

# Eval: Delete Agent — Full Cleanup Including Colocated Evals

## Task

Test that the ADK's delete mode removes the agent file, its colocated evals, and warns about any commands that reference it in their roster.

### Prompt

```
First, create a temporary agent called temp-cleanup-test in the platform/services namespace. It's a simple agent for testing deletion — tools: Read, Grep. Model: haiku. Skills: []. Description: "Temporary agent for delete flow testing."

After the agent and its evals are created, delete it using the ADK delete flow. Confirm when prompted.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform/services` |
| **Domain** | `services` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `agent` (create then delete) |

## Expected Outcomes

- [ ] **Agent created first** at `.aw/.aw_registry/platform/services/agents/temp-cleanup-test.md`
- [ ] **Evals created** in colocated directory
- [ ] **Delete flow initiated** — ADK switches to delete mode
- [ ] **Inventory shown** — lists the agent file + eval files that will be deleted
- [ ] **Dependency check** — scans for commands referencing this agent in their roster
- [ ] **User confirmation requested** — asks before deleting
- [ ] **Agent file deleted**
- [ ] **Colocated evals deleted** — entire `evals/temp-cleanup-test/` directory removed
- [ ] **`aw link` ran** after deletion

## Grading Criteria

### PASS

- All 9 outcomes met
- No orphaned files remain after deletion

### PARTIAL

- Agent deleted but evals left behind
- OR no confirmation requested before deletion

### FAIL

- Agent not deleted
- Delete without showing inventory
- No `aw link` after deletion

## Evaluation Method

**Type:** deterministic

### Deterministic Checks

```bash
# After delete, verify agent is gone
test ! -f ".aw/.aw_registry/platform/services/agents/temp-cleanup-test.md" || echo "FAIL: agent still exists"

# Verify evals directory is gone
test ! -d ".aw/.aw_registry/platform/services/agents/evals/temp-cleanup-test" || echo "FAIL: eval directory still exists"
```

## Baseline Expectations

- Without ADK: Manual file deletion, evals likely left orphaned.
- With ADK: Full inventory, dependency check, clean removal, sync.
- **Expected delta:** 0 orphaned files with ADK vs. likely orphans without
