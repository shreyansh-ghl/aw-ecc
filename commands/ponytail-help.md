---
name: ponytail-help
description: Quick reference for ponytail levels, skills, and commands
command: true
---

# Ponytail Help

Load and follow the `ponytail-help` skill, then carry out the instruction below.

The instruction text is vendored verbatim from upstream ponytail
(`commands/ponytail-help.toml`, MIT, DietrichGebert/ponytail) so behavior matches the
original. See `skills/ponytail/references/aw-integration.md` for how this fits
the AW SDLC and which AW rules outrank the ladder.

## Instruction

Show the ponytail quick reference. One shot, change nothing: do not switch mode, write flag files, or persist anything. Levels: /ponytail lite (build what's asked, name the lazier alternative in one line), /ponytail (full, the default ladder: YAGNI then stdlib then native then one line then minimum), /ponytail ultra (deletion before addition, challenges the requirement before building). Commands: /ponytail-review (over-engineering review of the current changes), /ponytail-audit (whole-repo over-engineering audit), /ponytail-debt (harvest ponytail: comments into a tracked ledger), /ponytail-gain (measured-impact scoreboard from the benchmark), /ponytail-help (this card). Deactivate with 'stop ponytail', 'normal mode', or /ponytail off; resume anytime with /ponytail. Default mode is full; change it with the PONYTAIL_DEFAULT_MODE environment variable (off|lite|full|ultra) or a config file at ~/.config/ponytail/config.json (Windows: %APPDATA%\ponytail\config.json) with {"defaultMode": "lite"}. Resolution order: env var, then config file, then full.
