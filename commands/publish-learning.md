---
name: aw:publish-learning
description: Turn a learned or evolved local pattern into a curated repo skill that ships across Codex, Cursor, and Claude.
argument-hint: "<learned skill path, evolved skill path, or pattern to publish>"
status: active
stage: learning
command: true
---

# Publish Learning

Use `/aw:publish-learning` when local learning is ready to become a real repo skill.

## Role

Promote a learned or evolved pattern into `skills/` so it becomes reviewable, installable, and portable across Codex, Cursor, and Claude.

## Accepted Inputs

- a learned skill under `~/.claude/skills/learned/`
- an evolved skill under `~/.claude/homunculus/**/evolved/skills/`
- a current-session pattern that is already well understood

## Workflow

1. Inspect the source pattern and its evidence.
2. Decide whether the pattern is genuinely reusable across repos or harnesses.
3. Normalize the content into a curated repo skill under `skills/<skill-slug>/SKILL.md`.
4. Keep the skill focused and production-safe; remove one-off or environment-specific details.
5. Capture provenance in repo-friendly form inside the skill body or frontmatter, not by committing home-directory artifacts.
6. Update any docs or command references that should advertise the new portable skill.
7. Open a PR so the skill can be reviewed like any other shipped repo asset.

## Portability Rule

- raw instincts stay in `~/.claude/homunculus/`
- learned local skills stay in `~/.claude/skills/learned/`
- evolved local skills stay in `~/.claude/homunculus/**/evolved/skills/`
- only repo `skills/` are shipped by `aw-ecc` installers to Codex, Cursor, and Claude

## Must Not Do

- must not commit raw `~/.claude/...` or `~/.codex/...` learning files into the repo
- must not publish a one-off project quirk as a portable cross-harness skill
- must not copy unstable drafts into `skills/` without trimming duplicate or speculative content

## Recommended Next Commands

- `/aw:learn-eval`
- `/aw:instinct-status`
- `/aw:evolve`
- `/aw:review`

## Final Output Shape

Always end with:

- `Source`
- `Portability Decision`
- `Target Skill`
- `Files`
- `Next`
