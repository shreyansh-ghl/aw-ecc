# AW ECC Install Profiles

This guide explains how to choose the smallest useful `aw-ecc` install without adding more persona presets or turning setup into a taxonomy exercise.

## Start Small

The install decision should follow the same principle as the public AW stage flow:

- start with the smallest setup that keeps work moving
- add only the language, framework, or capability packs you actually need
- avoid `full` unless you really want the broadest classified surface immediately

## Quick Recommendation

If you want the fastest answer, use this:

| Situation | Recommended profile |
| --- | --- |
| "I want the smallest safe AW baseline." | `core` |
| "I am doing normal software engineering work." | `developer` |
| "Security work is central to what I need." | `security` |
| "I mainly investigate, research, or write." | `research` |
| "I want everything that is currently classified." | `full` |

For most developers, `developer` is the best default.
For cautious first installs, `core` is the best default.

## What Each Profile Optimizes For

| Profile | What it gives you | When to choose it |
| --- | --- | --- |
| `core` | Baseline rules, agents, commands, hooks, platform config, and workflow quality support | First install, smaller repos, or teams that want to add packs intentionally |
| `developer` | The baseline plus framework/language guidance, database support, and orchestration | Most day-to-day coding across app repos |
| `security` | The baseline plus security-heavy guidance | Security reviews, hardening, or security-sensitive implementation work |
| `research` | The baseline plus research, content, and publishing-oriented capabilities | Deep investigation, synthesis, and writing-heavy sessions |
| `full` | Everything currently classified in the repo | You explicitly want maximum breadth and accept the larger surface area |

## Real Installer Examples

Use the installer directly when you want to control the footprint:

```bash
./install.sh --target codex --profile core
./install.sh --target cursor --profile developer --with lang:typescript --with framework:nextjs
./install.sh --target claude --profile security --with capability:research
./install.sh --target opencode --profile research --with capability:content
```

## Compose Instead Of Broadening

The better pattern is usually:

1. pick a profile
2. add the smallest missing pieces with `--with`
3. remove optional weight with `--without` when needed

Examples:

```bash
./install.sh --target cursor --profile developer --with lang:typescript --with framework:nextjs
./install.sh --target codex --profile core --with capability:security
./install.sh --target claude --profile developer --without capability:orchestration
```

This keeps adoption legible without creating role-specific install presets for every kind of user.

## Current `aw init` Note

The bundled `aw init` path described in the README still uses:

```bash
scripts/install-apply.js --target cursor --profile full
```

That is the current bundled default, not the only install shape the repo supports.
If you want a smaller setup today, run the installer directly with a narrower profile.

## Recommended Default

If you are unsure:

- choose `developer` for normal engineering work
- choose `core` if you want to learn the AW stage flow first and add capabilities later
- choose `full` only when you know you want the broadest catalog immediately
