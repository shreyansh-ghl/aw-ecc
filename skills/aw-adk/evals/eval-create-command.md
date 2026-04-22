---
name: eval-create-command
target: skill/aw-adk
category: functional
difficulty: advanced
---

# Eval: Create Command — Multi-Phase with Human Checkpoint

## Task

Test that the ADK creates a command with proper phase structure, agent roster, and — critically — generates evals that cover the command's own structure (human checkpoints, parallel agents, mid-pipeline failures). This eval targets the gap where the ADK created commands but derived evals from generic categories instead of the artifact's structure.

### Prompt

```
Create a command for database migration workflow in the platform/data namespace. It should have 4 phases: (1) pre-migration validation — check schema compatibility and generate migration plan, (2) backup — snapshot current state, (3) migrate — apply migration scripts with progress tracking, (4) post-migration verification — validate data integrity and rollback if checks fail. Phase 3 must have a human approval checkpoint before executing destructive changes. Create new agents for each phase within platform/data.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform/data` |
| **Domain** | `data` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `command` |

## Expected Outcomes

- [ ] **Type classified correctly** — identified as `command`
- [ ] **Interview conducted** — asked about workflow phases, agents, human checkpoints, namespace
- [ ] **Path resolved** — target at `.aw/.aw_registry/platform/data/commands/database-migration.md`
- [ ] **Command has AW-PROTOCOL reference** and skill loading gate
- [ ] **Agent roster table present** — with phase, agent name, model columns
- [ ] **Phase structure** — numbered phases with input/output/checkpoint/on-failure
- [ ] **Human checkpoint** — at least one phase blocks for human approval (migration is destructive)
- [ ] **CHECKPOINT output shown**
- [ ] **Lint ran and passed** — no phantom_agent errors
- [ ] **Scoring performed** — rubric-command.md read, 10-dimension score table
- [ ] **2+ evals created** — colocated at `commands/evals/<slug>/eval-*.md`
- [ ] **Evals derived from structure** — at least one eval covers the human checkpoint (approve AND reject paths)
- [ ] **Dependency chain eval present** — at least one eval validates all agents in roster exist
- [ ] **`aw link` ran**

## Grading Criteria

### PASS (all conditions met)

- All 14 outcomes checked
- Evals exercise the command's own phases, not just generic happy-path/failure

### PARTIAL (9+ of 14)

- Command created with correct structure
- But evals are generic (no checkpoint-specific or dependency-chain evals)

### FAIL (below 9)

- No phase structure
- No human checkpoint for a destructive workflow
- Steps 5-14 skipped
- Evals missing entirely

## Evaluation Method

**Type:** hybrid

### Deterministic Checks

```bash
# Verify command file exists
test -f ".aw/.aw_registry/platform/data/commands/database-migration.md" || echo "FAIL: file not found"

# Check for phase structure
grep -q "## Phase" ".aw/.aw_registry/platform/data/commands/database-migration.md" || echo "FAIL: no phases"

# Check for agent roster
grep -q "Agent Roster" ".aw/.aw_registry/platform/data/commands/database-migration.md" || echo "FAIL: no agent roster"

# Run lint
bash ~/.aw-ecc/skills/aw-adk/scripts/lint-artifact.sh ".aw/.aw_registry/platform/data/commands/database-migration.md" command

# Verify evals exist
ls .aw/.aw_registry/platform/data/commands/evals/database-migration/eval-*.md 2>/dev/null | wc -l | grep -q "[2-9]" || echo "FAIL: fewer than 2 evals"
```

### Model-Based Checks

- Does at least one eval test the human checkpoint with both approve and reject paths?
- Is the phase structure appropriate for a migration (pre-check, backup, migrate, validate, rollback)?
- Did the executor output a CHECKPOINT step?

## Baseline Expectations

- Without ADK: Command created but evals are generic (happy-path only), no checkpoint-specific evals.
- With ADK: Structure-derived evals covering human gates, dependency chains, and mid-pipeline failures.
- **Expected delta:** +2 structure-specific evals vs. generic-only
