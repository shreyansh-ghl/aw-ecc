# Releasing aw-ecc

A release happens when a PR that raises the version merges to `main`.
Use this checklist in that PR.

## Checklist

- [ ] **Bump the version.** CI's Version Bump Check fails the PR if
  `.claude-plugin/plugin.json` is not higher than on `main`. Set the same
  version in all of these files:
  - `package.json`
  - `package-lock.json` (top level and `packages[""]`)
  - `.claude-plugin/plugin.json`
  - `.claude-plugin/marketplace.json` (the `aw` plugin entry)
  - `.opencode/package.json`

  Check them with:

  ```bash
  node scripts/ci/validate-version-sync.js
  ```

- [ ] **Run the tests.** `npm test` must pass.

- [ ] **Update the server skill catalog if skills or commands changed.**
  List what changed since the last release:

  ```bash
  git fetch --tags
  git diff --name-status <previous-tag> HEAD -- 'skills/*/SKILL.md' 'commands/*.md'
  ```

  `<previous-tag>` is the latest `v*` tag, for example `v1.4.77`.
  Each line starts with a letter:
  - `A`: added. A new skill or command.
  - `D`: deleted. A removed skill or command.
  - `M`: modified. An existing skill or command changed. No catalog change
    is needed for this alone.
  - `R` (for example `R100`): renamed. Treat the old path as removed and
    the new path as added.

  If any line starts with `A`, `D` or `R`, update `apps/api/src/telemetry/usage-events/catalog/aw-skill-catalog.ts`
  in `GoHighLevel/ghl-agentic-workspace`:
  - add rows for new skills and commands;
  - set `active: false` for removed ones;
  - map new commands in `AW_COMMANDS`;
  - bump `CATALOG_SOURCE`.

  Until the catalog is updated, the server flags events for new skills
  `catalog_missing_skill` or counts them as non-AW. See
  [B10: release checklist for the server skill catalog](https://app.clickup.com/t/14zhcp5dwhy).

- [ ] **Merge to `main`.** The `Auto-tag and Release on merge` workflow
  (`.github/workflows/auto-tag.yml`) reads the version from
  `.claude-plugin/plugin.json`, then creates the `v<version>` tag and the
  GitHub Release. You do not need to tag by hand.

## If you push a tag by hand

`.github/workflows/release.yml` creates the release for a pushed `vX.Y.Z`
tag. It fails if the tag does not match the version in
`.claude-plugin/plugin.json`. It skips tags with a `-` (for example
`v1.5.0-rc.1`).
