# Writing Good Agents

An agent is an autonomous AI persona with identity, tools, and judgment. Unlike skills (passive knowledge) or rules (enforced constraints), agents reason independently, make decisions, and produce artifacts.

## Before / After: Identity

### Bad — thin identity

```yaml
identity:
  role: "A code reviewer"
```

The agent has no personality, no memory model, no domain grounding. It will produce generic reviews indistinguishable from a raw LLM prompt.

### Good — four-field identity

```yaml
identity:
  role: >
    Senior backend engineer specializing in NestJS microservices
    with 8+ years of production experience in multi-tenant SaaS platforms.
  personality: >
    Thorough but pragmatic. Flags critical issues firmly, treats style
    preferences as suggestions. Explains *why* something matters, not
    just *what* is wrong. Never condescending.
  memory: >
    Retains context about the current PR's changed files, related test
    coverage, and the service's recent incident history when available.
  experience: >
    Has debugged N+1 query issues, auth bypass vulnerabilities, and
    race conditions in event-driven architectures. Knows the difference
    between a real bug and a nitpick.
```

Why this works: The four fields constrain behavior across multiple axes. The agent knows *what* it is, *how* it communicates, *what* it remembers, and *what* patterns it recognizes from "experience."

## Before / After: Mission

### Bad — vague mission

```yaml
mission: "Review code and find issues"
```

No domain scope, no outcome definition, no boundary.

### Good — concrete mission with domain, outcomes, scope

```yaml
mission:
  domain: "Backend NestJS services in the payments domain"
  outcomes:
    - "Identify security vulnerabilities (auth bypass, injection, data leakage)"
    - "Flag performance issues (N+1 queries, missing indexes, unbounded loops)"
    - "Verify multi-tenancy scoping (locationId from auth context, not client)"
    - "Ensure error handling follows platform patterns (no empty catch, structured responses)"
  scope:
    includes:
      - "Changed files in the current PR"
      - "Test files corresponding to changed source files"
    excludes:
      - "Generated files (*.generated.ts, migrations)"
      - "Third-party library code"
      - "Style/formatting issues (handled by linter)"
```

## Before / After: Communication Style

### Bad — no communication guidance

The agent dumps findings in an unstructured wall of text with no severity indicators.

### Good — structured output contract

```yaml
communication:
  format: |
    ## Review Summary
    **Risk Level:** CRITICAL | HIGH | MEDIUM | LOW

    ### Findings
    For each finding:
    - **Severity:** CRITICAL / HIGH / MEDIUM / LOW
    - **File:** path/to/file.ts:lineNumber
    - **Issue:** One-sentence description
    - **Why:** Why this matters (security risk, data loss, performance)
    - **Fix:** Concrete code suggestion

    ### Verdict
    BLOCK (has CRITICAL) | APPROVE WITH COMMENTS | APPROVE
  rules:
    - "CRITICAL findings must include BLOCK verdict"
    - "Never say 'looks good' without evidence of what was checked"
    - "Maximum 10 findings per review — prioritize by severity"
```

## Anti-Pattern Catalog

### 1. God-Agent (Does Everything)

**Symptom:** One agent handles code review, testing, deployment, documentation, and security analysis.

**Fix:** Split by responsibility. Each agent should have one clear mission. A code reviewer does not deploy. A security reviewer does not write docs.

**Test:** If your agent's mission has more than 4 outcomes spanning unrelated domains, it's a god-agent.

### 2. Tool Hoarding

**Symptom:** Agent has 15 tools listed, uses 3 regularly.

**Fix:** Give agents only the tools they need for their mission. Extra tools waste context window and invite off-task behavior.

**Guideline:** 3-6 tools is typical. If an agent needs more than 8, it's probably a god-agent in disguise.

### 3. Missing Communication Style

**Symptom:** Agent produces output in unpredictable formats. Sometimes bullet lists, sometimes prose, sometimes JSON.

**Fix:** Define an explicit output contract. Specify the structure, severity labels, and verdict format. The consuming command or human needs to parse the output reliably.

### 4. No Measurable Metrics

**Symptom:** Agent mission says "improve code quality" with no way to verify.

**Fix:** Define observable outcomes:
- "Flag all uses of bare `any` type" (countable)
- "Identify missing test files for new source files" (binary per file)
- "Detect N+1 query patterns in repository methods" (specific pattern)

### 5. Generic Rules Without BLOCK/NEVER

**Symptom:** Agent instructions say "be careful with security" without specifying what triggers a block.

**Fix:** Use explicit behavioral boundaries:

```yaml
rules:
  BLOCK:
    - "Hardcoded secrets (API keys, passwords, tokens)"
    - "Missing auth guard on new endpoints"
    - "locationId from client input instead of auth context"
  NEVER:
    - "Never approve a PR with failing tests"
    - "Never suggest disabling TypeScript strict mode"
  PREFER:
    - "Prefer suggesting fixes over just flagging issues"
```

### 6. No Error Handling Guidance

**Symptom:** Agent crashes or produces garbage when it encounters unexpected input (empty diff, binary files, massive files).

**Fix:** Define edge case behavior:

```yaml
edge_cases:
  empty_diff: "Report 'No changes to review' and exit"
  binary_files: "Skip with note: 'Binary file skipped: {path}'"
  file_over_1000_lines: "Review only changed hunks, note that full file review was skipped"
```

## Scope Boundaries

### Agent vs Skill vs Command

| Dimension | Agent | Skill | Command |
|-----------|-------|-------|---------|
| **Has identity** | Yes | No | No |
| **Makes decisions** | Yes | No | Orchestrates decisions |
| **Loaded by** | Command or user | Agent or command | User directly |
| **Produces** | Findings, artifacts, verdicts | Nothing (passive reference) | End-to-end outcome |
| **Example** | Security reviewer | NestJS auth patterns | `/review-pr` |

### Decision Guide

- **Need autonomous judgment?** → Agent
- **Need reusable knowledge?** → Skill
- **Need a multi-step pipeline?** → Command (which uses agents)
- **Need an enforceable constraint?** → Rule

## Squad Assignment (1-9)

Squads group agents by domain for efficient coordination:

| Squad | Domain | Example Agents |
|-------|--------|----------------|
| 1 | Planning & Architecture | planner, architect |
| 2 | Implementation | coder, refactorer |
| 3 | Testing | tdd-guide, e2e-runner |
| 4 | Review & Quality | code-reviewer, security-reviewer |
| 5 | DevOps & Infrastructure | deployer, build-resolver |
| 6 | Documentation | doc-updater |
| 7 | Data & Analytics | data-reviewer |
| 8 | Frontend | ui-reviewer, a11y-checker |
| 9 | Coordination | command coordinators |

**Rules:**
- Agents in the same squad share domain context and can hand off seamlessly.
- Cross-squad communication goes through the coordinator (squad 9).
- An agent belongs to exactly one squad.

## Model Tier Selection

| Tier | Model | Use For | Cost Signal |
|------|-------|---------|-------------|
| **Coordinator** | Opus | Orchestration, judgment calls, architectural decisions, conflict resolution | High |
| **Worker** | Sonnet | Code generation, implementation, detailed review, refactoring | Medium |
| **Checker** | Haiku | Checklists, linting-style checks, simple validations, formatting | Low |

**Guidelines:**
- Coordinators (Opus) make judgment calls and resolve ambiguity. They do not write code.
- Workers (Sonnet) do the heavy lifting. Most agents are workers.
- Checkers (Haiku) handle mechanical tasks. Use when the task is deterministic and the instructions are clear enough for the smallest model.
- If a Haiku-tier agent produces inconsistent results, promote to Sonnet. If Sonnet can't handle the judgment, promote to Opus.

## Agent Quality Checklist

- [ ] Four-field identity (role, personality, memory, experience)
- [ ] Concrete mission with domain, outcomes, and scope boundaries
- [ ] 3-6 tools (no hoarding)
- [ ] Explicit output contract with structure and severity levels
- [ ] BLOCK/NEVER/PREFER behavioral rules
- [ ] Edge case handling defined
- [ ] Model tier justified (not defaulting to Opus for everything)
- [ ] Squad assignment documented
- [ ] Tested with representative inputs including edge cases
