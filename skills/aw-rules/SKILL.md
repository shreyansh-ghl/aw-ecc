---
name: aw-rules
description: Create, audit, fix, and score .aw_rules reference files grounded in real platform docs, skills, and codebase. Use when adding new rules, reviewing rule PRs, checking for hallucinated APIs, or improving rule quality.
trigger: when the user says /aw-rules, asks to create/add/audit/verify/fix/score rules, check rules for hallucinations, or manage .aw_rules content
---

# .aw_rules — Create, Audit, Fix, Score

Full lifecycle management for `.aw_rules/` reference files. Every code example must be verified against real platform docs, skills, and repos — never hallucinated.

## When to Use

- **Create**: Adding a new rule to `.aw_rules/platform/<domain>/references/`
- **Audit**: Verifying existing rules against real docs before merging a PR
- **Fix**: Correcting hallucinated APIs, fabricated URLs, wrong patterns
- **Score**: Rating rule quality against the rubric

## Commands

```
/aw-rules create backend/new-rule     # Create a new verified rule
/aw-rules audit backend               # Audit one domain
/aw-rules audit all                   # Audit all domains
/aw-rules audit all --fix             # Audit + auto-fix
/aw-rules score backend               # Score rules against quality rubric
```

---

## Create Workflow

1. **Identify the canonical source** — find the pattern in platform skills or docs first
2. **Read the source** — `.aw_registry/platform/docs/<domain>/` or `skills/<slug>/SKILL.md`
3. **If uncertain** — `gh search code "<pattern>" --owner GoHighLevel --limit 10`
4. **Write the rule** using WRONG/RIGHT format (~40 lines max):

```markdown
---
id: <domain>/<rule-name>
severity: MUST|SHOULD|MAY
domains: [<domain>]
paths: ["**/<glob-patterns>"]
---

# <Rule Title>

## Rule

<One sentence — what is required and why.>

## WRONG

\`\`\`typescript
// The violation
\`\`\`

## RIGHT

\`\`\`typescript
// The fix — verified against platform docs/skills
\`\`\`

> Full details: [<skill-link>](/platform/<domain>/skills/<slug>)
```

5. **Add to manifest.json** — id, severity, domains, rule path, description, principle
6. **Add one-liner to domain AGENTS.md**
7. **Self-audit** — run the 5-check verification below

---

## Audit Workflow

For each reference file, check 5 things:

| Check | How | Common Failures |
|-------|-----|-----------------|
| **Import paths** | Grep in skills + real repos | `@highrise/components` -> `@platform-ui/highrise` |
| **API patterns** | Read skill's SKILL.md | `v-model` -> `v-model:value` for HL |
| **URLs/paths** | Verify exist on disk or in repos | Fabricated git URLs, wrong module paths |
| **CLI commands** | Check docs for actual tools | `helm rollback` -> Jenkins pipeline |
| **Deprecated** | Search docs for deprecation | KEDA -> deprecated |

### Verification chain (per pattern)

```
1. Read the rule file
2. Read the linked skill (follow reference link at bottom)
3. Read platform docs (.aw_registry/platform/docs/<domain>/)
4. If uncertain: gh search code "<pattern>" --owner GoHighLevel --limit 10
5. Verdict: CORRECT / WRONG (with fix) / UNVERIFIABLE
```

---

## Score Rubric

| Dimension | 0 | 5 | 10 |
|-----------|---|---|-----|
| Frontmatter | Missing | id + severity | id + severity + domains + paths |
| Rule statement | Missing | Vague | One clear sentence |
| WRONG example | Missing | Generic | Real violation from GHL code |
| RIGHT example | Missing | Generic | Verified against skill/docs |
| Skill link | Missing | Wrong link | Correct link, skill exists |

**Score = /50 per file. Target: 40+.**

---

## Output Format

```markdown
## Audit: <domain>/<file>.md

| Line | Content | Verdict | Evidence |
|------|---------|---------|----------|
| 12 | `@platform-core/base-worker` | CORRECT | worker-patterns skill |
| 20 | `git::github.com/ghl/...` | WRONG | Real: `../modules/frontend-apps-infra` |

### Summary
- Files: 5 | CORRECT: 12 | WRONG: 3 | UNVERIFIABLE: 1
```

---

## References

- [verification-sources.md](references/verification-sources.md) — Where to look per domain
- [known-hallucinations.md](references/known-hallucinations.md) — Catalog of AI-fabricated patterns found in GHL rules
