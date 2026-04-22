---
name: eval-delete-skill
target: skill/aw-adk
category: functional
difficulty: intermediate
---

# Eval: Delete Skill — Reverse Reference Cleanup in Agents

## Task

Test that deleting a skill also finds and cleans up agents that reference it in their `skills:` frontmatter, preventing phantom dependencies.

### Prompt

```
First, create a temporary skill called temp-delete-test-patterns in the platform/data namespace. It teaches temporary testing patterns for data pipelines. It needs no scripts or references — just a simple SKILL.md.

Then create a temporary agent called temp-data-tester in the platform/data namespace. Tools: Read, Grep. Model: haiku. Skills: [platform-data-temp-delete-test-patterns]. Description: "Temporary agent that uses the temp skill."

After both are created, delete the skill temp-delete-test-patterns using the ADK delete flow. When warned about the agent reference, confirm you want to clean it up too. Confirm deletion when prompted.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform/data` |
| **Domain** | `data` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `skill` (create then delete) |

## Expected Outcomes

- [ ] **Skill created** at `.aw/.aw_registry/platform/data/skills/temp-delete-test-patterns/SKILL.md`
- [ ] **Agent created** referencing the skill in `skills:` frontmatter
- [ ] **Delete flow initiated** for the skill
- [ ] **Reverse reference scan** — finds the agent that references this skill
- [ ] **Warning shown** — "temp-data-tester references this skill in its skills: frontmatter"
- [ ] **User asked** whether to clean up the reference
- [ ] **Skill file + evals deleted**
- [ ] **Agent's skills: frontmatter updated** — reference to the deleted skill removed
- [ ] **No phantom dependencies remain** — agent no longer references a non-existent skill
- [ ] **`aw link` ran**

## Grading Criteria

### PASS

- All 10 outcomes met
- Agent file still exists but no longer references the deleted skill

### PARTIAL

- Skill deleted but agent's skills: frontmatter not updated (phantom created)
- OR no reverse reference scan performed

### FAIL

- Skill not deleted
- Agent also deleted (overkill — should only remove the reference)
- No warning about the dependent agent

## Evaluation Method

**Type:** hybrid

### Deterministic Checks

```bash
# Skill should be gone
test ! -d ".aw/.aw_registry/platform/data/skills/temp-delete-test-patterns" || echo "FAIL: skill still exists"

# Agent should still exist
test -f ".aw/.aw_registry/platform/data/agents/temp-data-tester.md" || echo "FAIL: agent was deleted (should only clean reference)"

# Agent should NOT reference the deleted skill
grep -q "temp-delete-test-patterns" ".aw/.aw_registry/platform/data/agents/temp-data-tester.md" 2>/dev/null && echo "FAIL: phantom reference in agent"
```

### Model-Based Checks

- Did the ADK warn about the agent dependency before deleting?
- Did it offer to clean up the reference rather than silently deleting?

## Baseline Expectations

- Without ADK: Skill deleted, agent left with phantom reference that breaks at runtime.
- With ADK: Reverse reference scan catches the dependency, cleans it up.
- **Expected delta:** 0 phantom references with ADK vs. 1+ without
