---
name: eval-delete-command
target: skill/aw-adk
category: functional
difficulty: intermediate
---

# Eval: Delete Command — Agent Roster Inventory + Shared Agent Handling

## Task

Test that deleting a command inventories its agent roster and asks the user whether each agent should also be deleted (they may be shared with other commands) or just left in place.

### Prompt

```
First, create a temporary command called temp-pipeline-test in the platform/data namespace. It has 2 phases: (1) validate — check input data format, (2) process — transform and store data. Create new agents for each phase: temp-pipeline-validator and temp-pipeline-processor. Both in platform/data, model: haiku, tools: Read, Bash.

After the command and agents are created, delete the command temp-pipeline-test using the ADK delete flow. When asked about the agents, say "delete both — they're not shared." Confirm deletion when prompted.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform/data` |
| **Domain** | `data` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `command` (create then delete) |

## Expected Outcomes

- [ ] **Command created** at `.aw/.aw_registry/platform/data/commands/temp-pipeline-test.md`
- [ ] **2 agents created** for the command's phases
- [ ] **Delete flow initiated** for the command
- [ ] **Inventory shown** — lists command file + colocated evals
- [ ] **Agent roster identified** — lists the 2 agents in the roster
- [ ] **User asked per agent** — "These agents are in the roster. Delete them too or leave them?"
- [ ] **Command file + evals deleted**
- [ ] **Both agents deleted** (per user instruction)
- [ ] **No phantom references remain** — no command referencing deleted agents, no agents referencing deleted command
- [ ] **`aw link` ran**

## Grading Criteria

### PASS

- All 10 outcomes met
- No orphaned files remain

### PARTIAL

- Command deleted but agents left without asking
- OR agents deleted without confirming with user

### FAIL

- Command not deleted
- Agents silently deleted without asking
- Agents left behind AND no mention of them in inventory

## Evaluation Method

**Type:** hybrid

### Deterministic Checks

```bash
# Command should be gone
test ! -f ".aw/.aw_registry/platform/data/commands/temp-pipeline-test.md" || echo "FAIL: command still exists"

# Command evals should be gone
test ! -d ".aw/.aw_registry/platform/data/commands/evals/temp-pipeline-test" || echo "FAIL: command evals remain"

# Agents should be gone (user said delete both)
test ! -f ".aw/.aw_registry/platform/data/agents/temp-pipeline-validator.md" || echo "FAIL: validator agent still exists"
test ! -f ".aw/.aw_registry/platform/data/agents/temp-pipeline-processor.md" || echo "FAIL: processor agent still exists"
```

### Model-Based Checks

- Did the ADK ask about each agent before deleting?
- Did it present the choice (delete vs. leave) rather than assuming?

## Baseline Expectations

- Without ADK: Command deleted, agents orphaned (still exist but nothing invokes them).
- With ADK: Full roster inventory, per-agent confirmation, clean removal.
- **Expected delta:** 0 orphaned agents with ADK vs. 2 without
