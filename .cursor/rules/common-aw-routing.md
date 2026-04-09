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
  - `~/.aw/.aw_rules/platform/universal/AGENTS.md`
  - `~/.aw/.aw_rules/platform/security/AGENTS.md`
- Then pick the smallest correct domain rule based on the requirement and current context, and read it before acting:
  - `api-design` -> `~/.aw/.aw_rules/platform/api-design/AGENTS.md` when you are defining or changing APIs, DTOs, request/response contracts, controller boundaries, or service-to-service/client integration shapes.
  - `backend` -> `~/.aw/.aw_rules/platform/backend/AGENTS.md` when you are implementing server-side business logic, workers, modules, orchestration, lifecycle behavior, or non-trivial runtime flows.
  - `data` -> `~/.aw/.aw_rules/platform/data/AGENTS.md` when you are choosing a database, designing schemas, changing persistence logic, writing migrations, tuning queries, or making indexing/data-model decisions.
  - `frontend` -> `~/.aw/.aw_rules/platform/frontend/AGENTS.md` when you are building or changing UI, composables, stores, user journeys, client-side state, rendering behavior, or browser interactions.
  - `infra` -> `~/.aw/.aw_rules/platform/infra/AGENTS.md` when you are touching deployment setup, Terraform, Helm, Docker, CI/CD, runtime configuration, environments, or operational wiring.
  - `mobile` -> `~/.aw/.aw_rules/platform/mobile/AGENTS.md` when the work is primarily for Flutter/mobile screens, widgets, device behavior, mobile navigation, or mobile-specific UX constraints.
  - `sdet` -> `~/.aw/.aw_rules/platform/sdet/AGENTS.md` when the task is about automated verification, Playwright coverage, regression strategy, QA scenarios, or strengthening the test harness itself.
- If more than one domain is relevant, choose the primary domain based on the main user outcome first, then load only the smallest additional domains needed for cross-cutting parts of the task.
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
