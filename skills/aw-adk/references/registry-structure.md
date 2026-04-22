# Registry Structure & Path Resolution

How CASRE artifacts are organized in the AW registry and rules system.

## Two Namespace Models

### Platform namespace (shared, read-only)

Platform is flat — no team/sub_team level. Domains are the primary organization:

```
.aw/                                    # ← root anchor — all registry paths start here
  .aw_registry/
    platform/
      <domain>/                     # core, frontend, infra, data, sdet, review, design, services
        skills/<slug>/SKILL.md
        agents/<slug>.md
        commands/<slug>.md
        evals/<type>/<slug>/eval-*.md   # colocated evals
```

**Domains:** core, frontend, infra, data, sdet, review, design, services

### Team namespaces

Teams always have `<team>/<sub_team>` and optionally nest further by domain:

```
.aw/
  .aw_registry/
    <team>/                         # crm, leadgen, revex, mobile
      <sub_team>/                   # users, events, forms, courses, memberships, core
        [<domain>/]                 # OPTIONAL: backend, core, frontend, infra, design, product, quality
          skills/<slug>/SKILL.md
          agents/<slug>.md
          commands/<slug>.md
```

**Key differences:**
- **`platform`** uses `platform/<domain>/CAS` — no team layer
- **Teams** use `<team>/<sub_team>/CAS` or `<team>/<sub_team>/<domain>/CAS`
- Some teams put CAS directly: `crm/users/agents/` (no domain nesting)
- Others nest fully: `leadgen/events/backend/agents/` (with domain)

### Rules structure (separate hierarchy)

Rules live outside the registry in `.aw/.aw_rules/`:

```
.aw/
  .aw_rules/                      # Platform-level (shared)
    platform/
      <domain>/                   # universal, security, frontend, backend, data, infra, sdet, mobile
        AGENTS.md                 # Main rules file
        references/<slug>.md      # Individual rule references
        evals/<slug>/eval-*.md    # Colocated rule evals
        <stack>/                  # Optional stack overlays
          AGENTS.md
          references/<slug>.md
    rule-manifest.json            # Registry of all platform rules

  .aw_rules.local/                # Team/repo-level (planned)
    rule-manifest-local.json
    render.json                   # Target mapping between platform + local layers
    <path>/AGENTS.md              # e.g., apps/billing/AGENTS.md
```

**Stack overlays:** `backend/nestjs/`, `backend/go-connect/`, `frontend/vue/`, `frontend/nuxt/`

## Path Resolution Flow

Use this decision tree to **construct** the exact target path. The rules are deterministic — walk the tree, substitute your variables, and you'll have the path. Searching is unnecessary because every combination of namespace + domain + type produces exactly one path.


```
1. Is this a RULE?
   ├── YES → Platform rule?
   │         ├── YES → .aw/.aw_rules/platform/<domain>/references/<slug>.md
   │         └── NO  → .aw/.aw_rules.local/<path>/AGENTS.md
   └── NO  → continue

2. Is this PLATFORM work?
   ├── YES → Ask: which domain?
   │         (core, frontend, infra, data, sdet, review, design, services)
   │         → .aw/.aw_registry/platform/<domain>/<type>/<slug>
   └── NO  → continue

3. Is this TEAM work?
   → Ask: which team? (crm, leadgen, revex, mobile)
   → Ask: which sub_team? (users, events, courses, memberships, core, etc.)
   → Ask: need domain nesting? (optional)
   ├── NO domain  → .aw/.aw_registry/<team>/<sub_team>/<type>/<slug>
   └── YES domain → .aw/.aw_registry/<team>/<sub_team>/<domain>/<type>/<slug>
```

## Naming Conventions

`aw link` creates symlinks across all IDE directories (`.claude/`, `.cursor/`, `.codex/`) using **all-hyphens** names. The formula comes from `link.mjs`: it takes every directory name between the namespace root and the artifact type directory, appends the artifact slug, and joins them all with hyphens. When a team uses optional domain nesting (e.g., `revex/reselling/backend/agents/`), the domain becomes an extra segment in the name.

| Type | Platform | Team (flat) | Team (with domain) | Stage/core |
|---|---|---|---|---|
| Command | `aw:platform-core-plan` | `aw:revex-reselling-<slug>` | `aw:revex-reselling-backend-<slug>` | `aw:build` |
| Agent | `platform-data-db-engineer` | `revex-reselling-redis-reviewer` | `revex-reselling-backend-<slug>` | `code-reviewer` |
| Skill | `platform-core-architecture-design` | `revex-reselling-redis-patterns` | `revex-reselling-backend-<slug>` | `skill-creator` |
| Rule | `<domain>/<slug>` | repo-local path | repo-local path | — |

Platform and team (flat) examples are real names from the live system. When in doubt, verify against what `aw link` actually created — the symlinks are the source of truth:
- Skills: `ls ~/.claude/skills/` (or `.cursor/`, `.codex/`)
- Agents: `ls ~/.claude/agents/`
- Commands: `ls ~/.claude/commands/aw/`

**Examples of cross-artifact references (all use the hyphen-joined symlink name):**

```yaml
# Agent loading skills
skills:
  - revex-reselling-redis-patterns
  - platform-data-mongodb-patterns

# Command loading agents
agents:
  - platform-review-security-reviewer
  - platform-review-performance-reviewer

# subagent_type in commands/skills
subagent_type: "platform-review-security-reviewer"
```

These all match the symlink names in `~/.claude/skills/` and `~/.claude/agents/` that `aw link` creates.

## Colocated Eval Placement

Evals live next to their parent artifact, not in a top-level `evals/` directory:

| Parent Type | Eval Location |
|---|---|
| Skill | `skills/<slug>/evals/eval-*.md` (inside skill dir) |
| Agent | `agents/evals/<slug>/eval-*.md` (sibling evals/ dir) |
| Command | `commands/evals/<slug>/eval-*.md` (sibling evals/ dir) |
| Rule | `rules/evals/<slug>/eval-*.md` or within `.aw/.aw_rules/` references |
| Eval (meta) | `evals/evals/eval-*.md` (self-referential) |

## How `aw pull` Maps to IDE Paths

After `aw pull`, registry artifacts are synced to IDE-local locations:

| Registry | Claude Code | Cursor | Codex |
|---|---|---|---|
| `skills/<slug>/SKILL.md` | `.claude/skills/<slug>/SKILL.md` | `.cursor/rules/<slug>.mdc` | `.codex/<slug>/` |
| `agents/<slug>.md` | `.claude/agents/<slug>.md` | `.cursor/rules/<slug>.mdc` | `.codex/<slug>/` |
| `commands/<slug>.md` | `.claude/commands/<slug>.md` | N/A (manual) | N/A |

`skills-lock.json` tracks installed skills with SHA256 integrity hashes (like package-lock.json for skills).
