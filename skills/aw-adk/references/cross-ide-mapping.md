# Cross-IDE Mapping

How AW registry artifacts manifest in different IDE environments after `aw init` and `aw pull`.

## IDE Path Mapping

| Artifact Type | Registry Path | Claude Code | Cursor | Codex |
|---|---|---|---|---|
| Skill | `.aw/.aw_registry/.../skills/<slug>/SKILL.md` | `.claude/skills/<slug>/SKILL.md` | `.cursor/rules/<slug>.mdc` | `.codex/skills/<slug>/` |
| Agent | `.aw/.aw_registry/.../agents/<slug>.md` | `.claude/agents/<slug>.md` | `.cursor/rules/<slug>.mdc` | `.codex/agents/<slug>.md` |
| Command | `.aw/.aw_registry/.../commands/<slug>.md` | `.claude/commands/<slug>.md` | N/A | N/A |
| Rule | `.aw/.aw_rules/platform/<domain>/references/<slug>.md` | `.claude/rules/<domain>/<slug>.md` | `.cursor/rules/<slug>.mdc` | `.codex/rules/<slug>.md` |

## How `aw init` Works

1. Creates `.claude/`, `.cursor/`, `.codex/` directories if missing
2. Installs core modules from `manifests/install-modules.json`
3. Copies hooks configuration to appropriate locations
4. Creates `skills-lock.json` to track installed versions

## How `aw pull` Works

1. Reads `skills-lock.json` for current state
2. Fetches latest from `.aw/.aw_registry/` (platform-docs or local)
3. Diffs against installed versions (SHA256 integrity check)
4. Copies updated artifacts to IDE-local paths
5. Updates `skills-lock.json`

## `skills-lock.json` Format

```json
{
  "version": 1,
  "skills": {
    "platform-core-aw-adk": {
      "source": ".aw/.aw_registry/platform/core/skills/aw-adk/SKILL.md",
      "integrity": "sha256-abc123...",
      "installed_at": "2026-04-22T10:00:00Z",
      "ide_paths": {
        "claude": ".claude/skills/aw-adk/SKILL.md",
        "cursor": ".cursor/rules/aw-adk.mdc"
      }
    }
  }
}
```

## Cursor-Specific Notes

Cursor uses `.mdc` (Markdown with Context) files. The conversion from `.md` to `.mdc`:
- Frontmatter is preserved as YAML
- Body content is wrapped in Cursor's context format
- `trigger` field maps to Cursor's "when" activation rules

## Codex-Specific Notes

Codex uses a flat directory structure under `.codex/`. Each artifact is a directory containing the artifact file plus any bundled resources.

## What to Tell the User

After creating any artifact, show them where it will appear:

```
Your new agent 'payments-processor' will be available at:

  Claude Code: .claude/agents/payments-processor.md
  Cursor:      .cursor/rules/payments-processor.mdc
  Codex:       .codex/agents/payments-processor.md

Run `aw pull` to sync from the registry to your IDE.
```
