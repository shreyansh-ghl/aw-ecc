# Artifact Wiring

How CASRE artifacts (Commands, Agents, Skills, Rules, Evals) reference each other.

## Relationship Graph

```
Commands
  │
  ├──references──► Agents (agent roster table with phase assignments)
  │                  │
  │                  ├──references──► Skills (skills: frontmatter field)
  │                  │                  │
  │                  │                  └──contains──► References (references/ subdirectory)
  │                  │
  │                  └──tested-by──► Evals (target: frontmatter)
  │
  ├──tested-by──► Evals (target: frontmatter)
  │
  └──governed-by──► Rules

Rules
  │
  ├──links-to──► Skills (skill link dimension)
  │
  └──tested-by──► Evals (target: frontmatter)

Skills
  │
  └──tested-by──► Evals (target: frontmatter)

Evals
  │
  └──tested-by──► Evals (meta-evals, target: frontmatter)
```

## Wiring Patterns

### Commands to Agents

Commands define which agents participate and in which phase via an **agent roster table** in the command body.

```markdown
## Agent Roster

| Phase | Agent | Role |
|-------|-------|------|
| 1 - Research | planner | Create implementation plan |
| 2 - Build | tdd-guide | Drive test-first development |
| 3 - Review | code-reviewer | Review changes |
| 3 - Review | security-reviewer | Security audit |
```

**Validation rules:**
- Every agent referenced in the roster must have a corresponding `agents/<slug>.md` file.
- Phase numbers must be sequential starting from 1.
- Each phase should have at least one agent assigned.

### Agents to Skills

Agents declare their skill dependencies in the `skills:` frontmatter field.

```yaml
---
name: planner
type: agent
skills:
  - aw-adk
  - incremental-implementation
---
```

**Validation rules:**
- Every slug in `skills:` must resolve to a `skills/<slug>/SKILL.md` file.
- Skills are loaded in declaration order; first skill's instructions take precedence on conflict.
- An agent without any skills is valid but should be flagged as a warning.

### Evals to Parent Artifact

Evals declare their target via the `target:` frontmatter field, using `<type>/<slug>` format.

```yaml
---
target: skill/aw-adk
type: eval
---
```

**Validation rules:**
- The `target:` value must resolve to an existing artifact.
- Valid target prefixes: `skill/`, `agent/`, `command/`, `rule/`.
- Meta-evals use `eval/` as the target prefix.
- Each artifact should have at least 2 evals targeting it.

### Rules to Skills

Rules reference related skills via a **skill link dimension** -- a markdown link or frontmatter field pointing to the skill that provides implementation guidance for the rule.

```markdown
## References

- Implement using [aw-adk](../../skills/aw-adk/SKILL.md) skill patterns
```

**Validation rules:**
- Skill links should resolve to existing skill files.
- Rules without skill links are valid (not all rules map to a skill).

### Skills to References

Skills contain a `references/` subdirectory with supporting markdown files linked from the skill body.

```
skills/aw-adk/
  SKILL.md
  references/
    schemas.md
    rubric-meta-eval.md
    eval-placement-guide.md
```

**Validation rules:**
- Every file in `references/` should be linked from `SKILL.md` or from another reference file.
- Orphaned reference files (not linked from anywhere) should be flagged as warnings.
- Reference files must be markdown (`.md`).

## Cross-Artifact Dependency Patterns

### Upward Dependencies (child references parent)

- Evals reference their parent artifact via `target:`
- This is the primary traceability mechanism.

### Downward Dependencies (parent references child)

- Commands reference agents via roster tables.
- Agents reference skills via `skills:` frontmatter.
- Skills reference documents via `references/` links.

### Lateral Dependencies (peer references)

- Rules reference skills for implementation guidance.
- Skills may reference other skills' reference documents.

## Validation Summary

| Relationship | Source Field | Target Resolution | Required? |
|---|---|---|---|
| Command -> Agent | Agent roster table | `agents/<slug>.md` | Yes |
| Agent -> Skill | `skills:` frontmatter | `skills/<slug>/SKILL.md` | No (warn if empty) |
| Eval -> Parent | `target:` frontmatter | `<type>/<slug>` path | Yes |
| Rule -> Skill | Markdown link | `skills/<slug>/SKILL.md` | No |
| Skill -> Reference | Markdown link | `references/<file>.md` | No (warn if orphaned) |

## Integrity Checks

Run these checks before merging any CASRE artifact:

1. **Forward resolution:** Every reference from artifact A to artifact B resolves to an existing file.
2. **Eval coverage:** Every skill, agent, and command has at least 2 evals with matching `target:` values.
3. **No orphans:** Reference files are linked from at least one parent. Evals have valid targets.
4. **No cycles:** The dependency graph is a DAG. Commands sit at the top; evals and references sit at the leaves.
