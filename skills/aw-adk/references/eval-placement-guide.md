# Eval Placement Guide

Evals live next to the artifacts they test. This document defines where eval files go and why.

## Why Colocated > Centralized

**Proximity to artifact.** When an eval lives in the same directory tree as the skill, agent, or command it tests, you see the eval every time you touch the artifact. Changes to the artifact naturally prompt eval updates.

**Discoverability.** A developer exploring a skill directory finds its evals without searching a separate `evals/` monolith. New contributors understand what "good" looks like by reading colocated evals.

**Ownership clarity.** The person who owns the artifact owns its evals. No ambiguity about who maintains a centralized eval that tests something in a different team's directory.

**Refactor safety.** When an artifact moves or gets renamed, colocated evals move with it. Centralized evals require separate updates and are often forgotten, leading to orphaned or broken evals.

## Directory Structure by Artifact Type

### Skills

Evals live inside the skill directory in an `evals/` subdirectory.

```
skills/
  <slug>/
    skill.md
    references/
    evals/
      eval-<purpose>.md
      eval-<purpose>.md
```

Example:
```
skills/
  aw-adk/
    skill.md
    references/
    evals/
      eval-create-happy-path.md
      eval-create-missing-fields.md
      eval-score-minimal.md
```

### Agents

Evals live in a sibling `evals/` directory scoped by agent slug.

```
agents/
  <slug>.md
  evals/
    <slug>/
      eval-<purpose>.md
      eval-<purpose>.md
```

Example:
```
agents/
  planner.md
  code-reviewer.md
  evals/
    planner/
      eval-plan-happy-path.md
      eval-plan-ambiguous-input.md
    code-reviewer/
      eval-review-security-issue.md
```

### Commands

Evals live in a sibling `evals/` directory scoped by command slug.

```
commands/
  <slug>.md
  evals/
    <slug>/
      eval-<purpose>.md
      eval-<purpose>.md
```

Example:
```
commands/
  aw-build.md
  evals/
    aw-build/
      eval-build-happy-path.md
      eval-build-missing-config.md
```

### Rules

Evals live either within `.aw/.aw_rules/` references or in a dedicated `rules/evals/` directory.

```
# Option A: Inside .aw/.aw_rules references
.aw/
  .aw_rules/
    platform/
      <domain>/
        references/
          eval-<purpose>.md

# Option B: Dedicated rules eval directory
rules/
  evals/
    <slug>/
      eval-<purpose>.md
```

### Meta-Evals (Evals of Evals)

Evals that test the eval system itself live in a nested `evals/evals/` directory.

```
evals/
  evals/
    eval-<purpose>.md
```

## Naming Convention

All eval files follow: `eval-<purpose>.md`

The `<purpose>` segment describes what the eval tests in lowercase kebab-case.

| Pattern | Example | Tests |
|---------|---------|-------|
| `eval-<action>-happy-path` | `eval-create-happy-path.md` | Standard successful execution |
| `eval-<action>-<failure>` | `eval-create-missing-fields.md` | Specific failure scenario |
| `eval-<action>-<edge>` | `eval-score-minimal.md` | Edge case or boundary condition |
| `eval-<action>-adversarial` | `eval-create-adversarial.md` | Adversarial or malicious input |

## Minimum Eval Count

Every artifact requires at least **2 evals**:

1. **Happy path** -- the artifact works correctly with valid, representative input.
2. **Failure scenario** -- the artifact handles invalid input, missing data, or error conditions gracefully.

For critical-path artifacts (commands users invoke directly, agents that orchestrate workflows), target **4+ evals**:

1. Happy path
2. Failure / error handling
3. Edge case (boundary values, minimal input, maximum input)
4. Adversarial (conflicting instructions, unexpected formats)

## Eval File Structure

Each eval file should contain:

```markdown
---
target: <artifact-type>/<slug>
type: eval
purpose: <brief description>
---

# Eval: <Title>

## Scenario
<Description of the test scenario and input>

## Expected Behavior
<What the artifact should produce or do>

## Grader
<How to determine pass/fail -- deterministic checks preferred>

## Pass Criteria
<Explicit, binary pass/fail conditions>
```

## Validation Checklist

Before merging an artifact, verify:

- [ ] At least 2 eval files exist in the correct directory
- [ ] Eval files follow `eval-<purpose>.md` naming
- [ ] Each eval has a `target:` frontmatter referencing the parent artifact
- [ ] At least one eval covers a failure scenario
- [ ] Eval graders are specific enough to fail on wrong output (see [rubric-meta-eval.md](rubric-meta-eval.md))
