---
description: "AW global routing: select route, READ stage skill, then respond"
alwaysApply: true
---
# AW Global Routing

## Hard Gate (MUST — do not skip)

For every non-trivial request, execute these steps in order before any substantive response:

1. **Load the router** — Read `~/.cursor/skills/using-aw-skills/SKILL.md`.

2. **Select route** — using the decision tree below, pick the smallest correct AW route.

3. **Read the stage skill** — you MUST `Read` the matching skill file before responding:
   - `/aw-plan` → Read `~/.cursor/skills/aw-plan/SKILL.md`
   - `/aw-build` → Read `~/.cursor/skills/aw-build/SKILL.md`
   - `/aw-investigate` → Read `~/.cursor/skills/aw-investigate/SKILL.md` (or `aw-debug`)
   - `/aw-test` → Read `~/.cursor/skills/aw-test/SKILL.md` (or `aw-verify`)
   - `/aw-review` → Read `~/.cursor/skills/aw-review/SKILL.md`
   - `/aw-deploy` → Read `~/.cursor/skills/aw-deploy/SKILL.md`
   - `/aw-ship` → Read `~/.cursor/skills/aw-ship/SKILL.md`

4. **Follow the skill's behavior** — produce the artifacts the skill defines, not general-knowledge answers.

5. **Then respond** — only after steps 1-4 are done.

Stating "Selected AW Route: /aw-plan" without Reading the skill file is NOT compliance. The Read must happen.

## Route Decision Tree

```text
Does an approved plan/spec already exist for this exact work?
├── NO → Is the request about a bug, alert, or unclear failure?
│         ├── YES → /aw-investigate
│         └── NO  → /aw-plan  ← DEFAULT for anything new
└── YES → Is the work implemented and needs testing/review?
          ├── YES → /aw-test or /aw-review
          └── NO  → Is this a deploy or release action?
                    ├── YES → /aw-deploy or /aw-ship
                    └── NO  → /aw-build
```

**Plan-first rule**: New endpoints, services, schemas, features, architecture changes, and integrations ALL go through `/aw-plan` first. `/aw-build` requires an approved plan or a mechanical change (bug fix, rename, config update).

## Default Assumptions

- `/aw-plan` → write file artifacts under `.aw_docs/features/<slug>/` unless the user explicitly says "chat only".
- `/aw-build` → code changes with tests.
- `/aw-investigate` → reproduction + root cause evidence.

## Org Rules

- Always read:
  - `~/.aw_rules/platform/universal/AGENTS.md`
  - `~/.aw_rules/platform/security/AGENTS.md`
- Then pick the smallest correct domain rule based on the requirement and current context, and read it before acting:
  - `api-design` -> `~/.aw_rules/platform/api-design/AGENTS.md`
  - `backend` -> `~/.aw_rules/platform/backend/AGENTS.md`
  - `data` -> `~/.aw_rules/platform/data/AGENTS.md`
  - `frontend` -> `~/.aw_rules/platform/frontend/AGENTS.md`
  - `infra` -> `~/.aw_rules/platform/infra/AGENTS.md`
  - `mobile` -> `~/.aw_rules/platform/mobile/AGENTS.md`
  - `sdet` -> `~/.aw_rules/platform/sdet/AGENTS.md`
- Load `references/` under the chosen domain on demand.
- If repo-local instructions conflict with org-level AW rules, follow the org-level AW rules.

## Compatibility

- `/aw-execute` → resolve to `/aw-build`
- `/aw-verify` → resolve to `/aw-test` or `/aw-review`
