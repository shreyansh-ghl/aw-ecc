---
description: "AW global routing: use the AW router skill first, then apply org rules and references by domain"
alwaysApply: true
---
# AW Global Routing

- Before any substantive response, load `using-aw-skills` from `~/.cursor/skills/using-aw-skills/SKILL.md`.
- Select the smallest correct AW route first:
  - `/aw:plan`
  - `/aw:build`
  - `/aw:investigate`
  - `/aw:test`
  - `/aw:review`
  - `/aw:deploy`
  - `/aw:ship`
- For non-trivial requests, the first substantive line should be `Selected AW Route: <route>`.
- After the route is known, load the matching AW stage skill from `~/.cursor/skills/` and only the smallest supporting skills needed.

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
- Load `references/` under the chosen domain on demand when implementation details or canonical links matter.
- If repo-local instructions conflict with org-level AW rules, follow the org-level AW rules.

## Route Hints

- Ideas, architecture, specs, planning, new project setup, and database choice -> `/aw:plan`
- Implementation, bug fixing, and build work -> `/aw:build`
- Unclear failures, alerts, or root-cause hunting -> `/aw:investigate`
- QA proof, regression evidence, and validation -> `/aw:test`
- Findings, readiness, and approval decisions -> `/aw:review`
- One release action -> `/aw:deploy`
- Rollout, rollback readiness, and closeout -> `/aw:ship`
