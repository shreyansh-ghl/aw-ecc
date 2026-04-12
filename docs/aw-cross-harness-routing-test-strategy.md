# AW Cross-Harness Routing Test Strategy

This document defines the minimum confidence bar for AW routing across:

- Cursor
- Codex
- Claude

The goal is not only "the hook ran" but "the harness actually received the right routing and rule context."

## Core Assertions

Every harness release should prove these four assertions:

1. hooks are triggered
2. AW rules are referenced from the expected path and shape
3. `using-aw-skills` is selected before substantive work
4. related stage and support skills can be selected from that router contract

## Confidence Layers

Use four layers, in this order.

### 1. Packaging Contract

Proves the shipped bundle still exposes the expected hook config, generated outputs, and shell entrypoints.

Run in `aw-ecc`:

```bash
cd /private/tmp/aw-ecc-cursor-routing-fixes-clean
node tests/lib/claude-aw-generated-output.test.js
node tests/lib/codex-aw-generated-output.test.js
node tests/lib/cursor-aw-generated-output.test.js
node tests/lib/cursor-aw-bundle.test.js
```

What this proves:

- Claude, Codex, and Cursor generated bundles still exist
- generated hook outputs still match their source templates
- Cursor bundle still contains the expected hooks, rules, and skills payload

### 2. Hook Contract

Proves the harness hook surfaces still map to the expected AW lifecycle phases and that the shared shell entrypoints behave correctly.

Run in `aw-ecc`:

```bash
cd /private/tmp/aw-ecc-cursor-routing-fixes-clean
node tests/lib/aw-hook-contract.test.js
node tests/hooks/shared-hook-entrypoints.test.js
node tests/lib/cursor-before-submit-prompt.test.js
node tests/lib/aw-shared-phase-runner.test.js
```

What this proves:

- each harness exposes the required AW-managed phases
- `sessionStart` and prompt-submit wrappers still invoke the shared runtime
- the shared phase runner preserves the harness-specific output shape

### 3. Router and Skill Activation

Proves the prompt and session contract still forces AW-first behavior, not just hook execution.

Run in `aw-ecc`:

```bash
cd /private/tmp/aw-ecc-cursor-routing-fixes-clean
node tests/evals/deterministic/capability/aw-sdlc-activation-strictness.test.js
node tests/evals/deterministic/capability/aw-sdlc-skill-trigger-coverage.test.js
```

Optional deeper routing pass:

```bash
cd /private/tmp/aw-ecc-cursor-routing-fixes-clean
node tests/evals/routing/aw-sdlc-codex-routing.test.js
```

What this proves:

- the first-response contract still requires AW route selection
- `using-aw-skills` remains the router source of truth
- the trigger matrix still covers the public AW routes and their stage/support skills

### 4. Install and Doctor Validation

Proves the consuming AW CLI repo still installs, validates, and diagnoses the correct harness state.

Run in `ghl-agentic-workspace`:

```bash
cd "/Users/prathameshai/Documents/Agentic Workspace/ghl-agentic-workspace-pr-aw-router-beta/libs/aw"
node --test tests/hook-manifest.test.mjs tests/hook-phase-scripts.test.mjs tests/hooks-codex-home.test.mjs tests/hooks-session-start.test.mjs tests/router-bridge-hook-config.test.mjs tests/workspace-hook-defaults.test.mjs tests/rules-live-verification.test.mjs
npx vitest run tests/commands/doctor.test.mjs
```

What this proves:

- install-time manifests still generate the expected home and workspace hook surfaces
- rules still render and resolve correctly
- `doctor` still detects missing or stale Cursor, Codex, and Claude surfaces

## Manual App-In-The-Loop Smoke

Automated tests are necessary but not sufficient.

Each release candidate should still perform one fresh-chat smoke per harness.

### Cursor

1. reload the app
2. start a new chat in the target workspace
3. send a prompt that should route to planning
4. inspect `Output -> Hooks`

Useful local check:

```bash
LOG=$(ls -td "$HOME/Library/Application Support/Cursor/logs"/*/window1/output_*/*cursor.hooks*.log | head -1)
tail -120 "$LOG"
```

Pass criteria:

- `sessionStart` is invoked
- `beforeSubmitPrompt` is invoked
- the prompt rewrite or reminder references AW routing
- the first substantive answer follows the expected AW route shape

### Claude

Direct shell smoke:

```bash
printf '{"cwd":"'"$PWD"'","hook_event_name":"SessionStart"}' | bash ~/.claude/scripts/hooks/session-start-rules-context.sh
printf '{"cwd":"'"$PWD"'","prompt":"Plan a new backend service"}' | bash ~/.claude/scripts/hooks/shared/user-prompt-submit.sh
```

Pass criteria:

- session-start emits the expected additional context or reminder text
- prompt-submit exits `0`
- rule reminders point at the expected AW rules location

### Codex

Direct shell smoke:

```bash
printf '{"cwd":"'"$PWD"'","hook_event_name":"SessionStart"}' | bash ~/.codex/hooks/aw-session-start.sh
```

Pass criteria:

- `hookSpecificOutput.additionalContext` is present
- the content requires route-first behavior
- the router source points at `skills/using-aw-skills/SKILL.md`

## Release Gate

Do not call a harness release healthy unless:

- packaging contract is green
- hook contract is green
- router activation checks are green
- AW CLI install/doctor checks are green or the failures are understood and intentionally accepted
- one manual app-level smoke was run for each target harness

## Current Gaps Found On 2026-04-11

These are current real gaps from local execution, not theoretical ones.

### `aw-ecc`

- `tests/lib/aw-hook-contract.test.js` fails on the clean Cursor PR branch because `.codex/hooks.json` is absent there
- this means the test is stricter than the current branch contents, or the branch is missing the expected Codex output

### `ghl-agentic-workspace`

- `tests/commands/doctor.test.mjs` currently has four failing cases
- the failures are around:
  - healthy doctor report severity
  - stale project router bridge severity
  - Codex `AGENTS.md` missing-rules severity
  - Codex broken rule-path severity

This means the doctor policy and the current product behavior are not fully aligned yet.

### Installed Home Smoke

Direct home-level smokes found two regressions:

- Cursor home `before-submit-prompt.sh` still tried to execute `/Users/prathameshai/scripts/hooks/shared/user-prompt-submit.sh`, which is the wrong root
- Claude home session-start still referenced workspace-root `.aw_rules/platform/...` in local output instead of the newer `.aw/.aw_rules/...` expectation we were testing elsewhere

Those should be treated as real release blockers until the installed home bundle matches the PR branch contract.

## Recommended CI Split

Use three CI lanes.

### Lane A: `aw-ecc` harness contract

- generated bundle tests
- shared hook entrypoint tests
- hook contract tests
- Cursor prompt wrapper tests

### Lane B: `aw-ecc` router behavior

- activation strictness
- skill trigger coverage
- selected routing evals

### Lane C: `ghl-agentic-workspace` consumer validation

- hook manifest and script tests
- rules rendering and live verification
- `doctor` policy suite

This split keeps fast contract failures separate from slower routing validation and consumer integration checks.

## Fresh Environment Command

Use this repo-local command to prove fresh setup plus real CLI routing in one pass:

```bash
npm run eval:aw:fresh-env-cli-smoke
```

What it does:

- creates an isolated temp home + workspace
- installs `@ghl-ai/aw` into that fresh environment
- runs the real Cursor, Codex, and Claude CLI smokes against that new workspace
- writes artifacts under the temp root printed by the script

Related helpers:

- `tests/evals/setup-aw-isolated-space.sh`
- `tests/evals/run-aw-isolated-init.sh`
- `tests/evals/run-aw-fresh-env-cli-smoke.sh`
