# Cursor AW Routing Issues

Date: 2026-04-10

## What We Confirmed

- Cursor can execute `sessionStart` and `beforeSubmitPrompt` successfully.
- Cursor can merge valid hook responses.
- Cursor can use native rules more reliably when the rule is marked `alwaysApply: true`.
- The current AW Cursor install still has several packaging and runtime gaps, so routing is not reliably enforced end to end.

## Confirmed Issues

### 1. AW router and stage skills were missing from Cursor home

- `~/.cursor/skills/` existed, but it did not include:
  - `using-aw-skills`
  - `aw-plan`
  - `aw-build`
  - `aw-investigate`
  - `aw-test`
  - `aw-review`
  - `aw-deploy`
  - `aw-ship`
- Root cause:
  - Cursor only installs the bundled subset from `.cursor/skills/`.
  - That subset did not include the AW SDLC/router skills.

### 2. Cursor hook config was overwritten by the packaged copy

- `~/.cursor/hooks.json` reverted to the packaged `~/.aw-ecc/.cursor/hooks.json`.
- This removed the local working fixes.
- Root cause:
  - `aw init` and related install flows sync the packaged Cursor config back into user home.

### 3. Packaged Cursor hooks used relative commands that break user-home installs

- The packaged config used commands like:
  - `node .cursor/hooks/session-start.js`
  - `node .cursor/hooks/before-submit-prompt.js`
- In a user-home install, Cursor resolved those like:
  - `~/.cursor/.cursor/hooks/...`
- Root cause:
  - The packaged config assumes repo-style relative execution instead of stable absolute user-home paths.

### 4. The Cursor adapter assumed the wrong root for user-home installs

- `adapter.js` used `dirname(dirname(__dirname))`.
- That works for repo layout:
  - `repo/.cursor/hooks -> repo`
- It is wrong for user-home layout:
  - `~/.cursor/hooks -> should resolve to ~/.cursor`
- Root cause:
  - One root-resolution strategy was used for two different layouts.

### 5. The AW bridge was more complex than needed

- Cursor used JS wrappers plus adapter indirection plus shell scripts.
- The minimal AW routing flow only needs thin shell entrypoints.
- Root cause:
  - The bridge inherited a broader multi-hook runtime instead of keeping the AW routing path small.

### 6. Hook reminders did not mean Cursor actually loaded the referenced skills or rules

- Saying "apply `using-aw-skills`" in hook output did not make Cursor load that skill.
- Mentioning rule file paths also did not make Cursor load them automatically.
- Root cause:
  - Cursor hook output is context text, not a true file-load mechanism.

### 7. `beforeSubmitPrompt` is soft guidance, not hard routing enforcement

- The prompt could be rewritten successfully.
- Cursor still sometimes answered generically instead of following AW route selection.
- Root cause:
  - `beforeSubmitPrompt` influences model context, but it does not force the model to obey the route.

### 8. Rules only became reliable when marked `alwaysApply`

- Global rule content started working only after using an always-on rule shape.
- Without `alwaysApply`, the routing rule was not consistently present in context.
- Root cause:
  - The rule was valid, but it was not guaranteed to be injected on every request.

### 9. `~/.cursor/rules` alone was not the stable foundation we expected

- Native Cursor behavior was stronger with an always-apply rule in the active rules surface than with indirect assumptions about home rules.
- Root cause:
  - Our AW mental model was closer to Codex/Claude global instruction loading than Cursor's softer rule model.

### 10. Local hotfixes were fragile until the source bundle is updated

- Manual fixes in:
  - `~/.cursor/hooks.json`
  - `~/.cursor/hooks/adapter.js`
  - `~/.cursor/skills/*`
  can be lost on the next install/init.
- Root cause:
  - The packaged source still contains the older Cursor bundle and config.

### 11. Cursor `sessionStart` executed, but the shared phase runner dropped its output

- The installed `sessionStart` command ran successfully.
- The delegated hook returned valid Claude-style `hookSpecificOutput.additionalContext`.
- The shared Cursor phase runner returned the original raw payload instead of converting that output into Cursor `additional_context`.
- Root cause:
  - `runSharedAwPhase()` always returned the original input and did not preserve step output for session-start phases.

## What Worked Best Locally

The strongest local setup was:

- a native Cursor routing rule marked `alwaysApply: true`
- shell-first `sessionStart`
- shell-first `beforeSubmitPrompt`
- absolute commands in `~/.cursor/hooks.json`
- home-install-aware adapter behavior
- manual copy of AW router and stage skills into `~/.cursor/skills`

## Recommended Product Direction

Create one global Cursor routing rule for AW that is always-on and minimal.

It should do only this:

- declare home `AGENTS.md` as global authority
- require `using-aw-skills` first
- require AW route selection before substantive answers
- require loading applicable `aw_rules` references by domain
- keep repo-local instructions additive only

And pair it with:

- shell-first `sessionStart`
- shell-first `beforeSubmitPrompt`
- bundled AW router/stage skills in `.cursor/skills/`
- absolute user-home hook commands

## Source-Level Fixes Still Needed

1. Add AW router and stage skills to `.cursor/skills/`.
2. Update packaged `.cursor/hooks.json` to use stable user-home commands.
3. Update the adapter to support both repo and user-home layouts safely.
4. Ship an always-apply global Cursor routing rule for AW.
5. Preserve and translate `sessionStart` hook output into Cursor `additional_context`.
6. Add install/eval coverage so Cursor bundle drift is caught automatically.
