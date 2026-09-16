---
name: ponytail-help
description: >
  Quick-reference card for all ponytail modes, skills, and commands.
  One-shot display, not a persistent mode. Trigger: /ponytail-help,
  "ponytail help", "what ponytail commands", "how do I use ponytail".
---

# Ponytail Help

Display this reference card when invoked. One-shot, do NOT change mode,
write flag files, or persist anything.

## Levels

| Level | Trigger | What change |
|-------|---------|-------------|
| **Lite** | `/ponytail lite` | Build what's asked, name the lazier alternative in one line. |
| **Full** | `/ponytail` | The ladder enforced: YAGNI → stdlib → native → one line → minimum. Default. |
| **Ultra** | `/ponytail ultra` | YAGNI extremist. Deletion before addition. Challenges requirements before building. |

Level sticks until changed or session end.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **ponytail** | `/ponytail` | Lazy mode itself. Simplest solution that works. |
| **ponytail-review** | `/ponytail-review` | Over-engineering review: `L42: yagni: factory, one product. Inline.` |
| **ponytail-audit** | `/ponytail-audit` | Whole-repo over-engineering audit: ranked list of what to delete. |
| **ponytail-debt** | `/ponytail-debt` | Harvest `ponytail:` shortcut comments into a tracked ledger. |
| **ponytail-gain** | `/ponytail-gain` | Measured-impact scoreboard: less code, less cost, more speed. |
| **ponytail-help** | `/ponytail-help` | This card. |

In AW all six ship as `/aw:`-prefixed commands — `/aw:ponytail`,
`/aw:ponytail-review`, `/aw:ponytail-audit`, `/aw:ponytail-debt`,
`/aw:ponytail-gain`, `/aw:ponytail-help` — and as the skills `aw:ponytail*`.
Codex resolves the same skills with `@`. You rarely need to type them: `/aw:plan`
loads `ponytail` before it freezes the technical path, `/aw:build` loads it at
slice selection, and `/aw:review` routes the simplicity axis through
`ponytail-review`. See `skills/ponytail/references/aw-integration.md`.

## Deactivate

Say "stop ponytail" or "normal mode". Resume anytime with `/ponytail`.
`/ponytail off` also works.

## Configure Default Mode

Default mode = `full`, auto-active every session. Change it:

**Environment variable** (highest priority):
```bash
export PONYTAIL_DEFAULT_MODE=ultra
```

**Config file** (`~/.config/ponytail/config.json`, Windows: `%APPDATA%\ponytail\config.json`):
```json
{ "defaultMode": "lite" }
```

Set `"off"` to disable auto-activation on session start, activate manually
with `/ponytail` when wanted.

Resolution: env var > config file > `full`.

## Update

Ponytail is vendored into AW, so it updates with AW rather than from the
upstream marketplace. Skills and hooks ride the `aw-ecc` plugin: a new
`AW_ECC_TAG` picked up by `aw init` brings them in. The stage-skill load points
ride the registry: `aw pull` refreshes those.

To re-sync against a newer upstream ponytail release, bump the pinned commit in
`skills/ponytail/vendor-managed-sync.json` and re-copy the six `SKILL.md` bodies
verbatim — they are kept byte-identical to upstream precisely so that diff stays
clean. The only local edits are recorded in that same file.

## More

Upstream docs + examples: https://github.com/DietrichGebert/ponytail (MIT).
AW wiring, precedence, and the GHL platform mapping:
`skills/ponytail/references/aw-integration.md`.
