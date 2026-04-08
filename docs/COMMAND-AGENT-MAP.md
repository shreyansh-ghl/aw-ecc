# Command → Agent / Skill Map

This document lists each slash command and the primary agent(s) or skills it invokes, plus notable direct-invoke agents. Use it to discover which commands use which agents and to keep refactoring consistent.

| Command | Primary agent(s) | Notes |
|---------|------------------|--------|
| `/plan` | planner | Implementation planning before code |
| `/tdd` | tdd-guide | Test-driven development |
| `/code-review` | code-reviewer | Quality and security review |
| `/build-fix` | build-error-resolver | Fix build/type errors |
| `/e2e` | e2e-runner | Playwright E2E tests |
| `/refactor-clean` | refactor-cleaner | Dead code removal |
| `/update-docs` | doc-updater | Documentation sync |
| `/update-codemaps` | doc-updater | Codemaps / architecture docs |
| `/go-review` | go-reviewer | Go code review |
| `/go-test` | tdd-guide | Go TDD workflow |
| `/go-build` | go-build-resolver | Fix Go build errors |
| `/python-review` | python-reviewer | Python code review |
| `/harness-audit` | — | Harness scorecard (no single agent) |
| `/loop-start` | loop-operator | Start autonomous loop |
| `/loop-status` | loop-operator | Inspect loop status |
| `/quality-gate` | — | Quality pipeline (hook-like) |
| `/model-route` | — | Model recommendation (no agent) |
| `/orchestrate` | planner, tdd-guide, code-reviewer, security-reviewer, architect | Multi-agent handoff |
| `/multi-plan` | architect (Codex/Gemini prompts) | Multi-model planning |
| `/multi-execute` | architect / frontend prompts | Multi-model execution |
| `/multi-backend` | architect | Backend multi-service |
| `/multi-frontend` | architect | Frontend multi-service |
| `/multi-workflow` | architect | General multi-service |
| `/aw:learn` | — | continuous-learning skill, local learned skills |
| `/aw:learn-eval` | — | continuous-learning-v2, evaluate then save or publish |
| `/aw:instinct-status` | — | continuous-learning-v2 |
| `/aw:instinct-import` | — | continuous-learning-v2 |
| `/aw:instinct-export` | — | continuous-learning-v2 |
| `/aw:evolve` | — | continuous-learning-v2, cluster instincts |
| `/aw:promote` | — | continuous-learning-v2 |
| `/aw:projects` | — | continuous-learning-v2 |
| `/aw:publish-learning` | — | publish learned or evolved patterns into portable repo skills |
| `/aw:save-session` | — | Session persistence / handoff |
| `/aw:resume-session` | — | Session restore / reorientation |
| `/skill-create` | — | skill-create-output script, git history |
| `/checkpoint` | — | verification-loop skill |
| `/verify` | — | verification-loop skill |
| `/eval` | — | eval-harness skill |
| `/test-coverage` | — | Coverage analysis |
| `/aw:sessions` | — | Session history |
| `/setup-pm` | — | Package manager setup script |
| `/claw` | — | NanoClaw CLI (scripts/claw.js) |
| `/pm2` | — | PM2 service lifecycle |
| `/security-scan` | security-reviewer (skill) | AgentShield via security-scan skill |

## Direct-Use Agents

| Direct agent | Purpose | Scope | Notes |
|--------------|---------|-------|-------|
| `typescript-reviewer` | TypeScript/JavaScript code review | TypeScript/JavaScript projects | Invoke the agent directly when a review needs TS/JS-specific findings and there is no dedicated slash command yet. |

## Skills referenced by commands

- **continuous-learning**, **continuous-learning-v2**: `/aw:learn`, `/aw:learn-eval`, `/aw:instinct-*`, `/aw:evolve`, `/aw:promote`, `/aw:projects`, `/aw:publish-learning`
- **verification-loop**: `/checkpoint`, `/verify`
- **eval-harness**: `/eval`
- **security-scan**: `/security-scan` (runs AgentShield)
- **strategic-compact**: suggested at compaction points (hooks)

## How to use this map

- **Discoverability:** Find which command triggers which agent (e.g. “use `/code-review` for code-reviewer”).
- **Refactoring:** When renaming or removing an agent, search this doc and the command files for references.
- **CI/docs:** The catalog script (`node scripts/ci/catalog.js`) outputs agent/command/skill counts; this map complements it with command–agent relationships.
