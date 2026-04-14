---
name: aw-rules-review
description: Generate a per-file review worksheet driven by rule-manifest.json. Supports all tracked files, PR diff, branch diff, or explicit file list. Use for isolated manifest-driven rule audits.
---

# AW Rules Review

Generate a per-file review worksheet that maps source files to applicable platform rules from `rule-manifest.json`. Supports multiple scoping modes — full repo, PR diff, branch diff, or explicit file list.

## What This Skill Does

1. Locates `rule-manifest.json` (workspace `.aw_registry/` → global `~/.aw/.aw_registry/`)
2. Collects source files based on the chosen mode (PR, diff, file list, or all)
3. Detects each file's domain(s) and stack(s) from its path
4. Matches applicable rules by domain + stack overlap
5. Generates a per-file checklist worksheet with blank status for each rule

## Modes

### All tracked files (default)

```bash
node scripts/generate-review-template.mjs
```

### PR diff

Reviews only files changed in a GitHub PR. Requires `gh` CLI.

```bash
node scripts/generate-review-template.mjs --pr 1234
```

### Branch diff

Reviews files changed between the current branch and its merge-base with main/master.

```bash
node scripts/generate-review-template.mjs --diff
node scripts/generate-review-template.mjs --diff --base origin/develop
```

### Explicit file list

```bash
node scripts/generate-review-template.mjs --files "src/foo.ts,src/bar.vue"
```

### Custom output path

```bash
node scripts/generate-review-template.mjs --pr 1234 --out review.md
```

## Manifest Resolution

The script searches for the rule manifest in this order:

1. `$WORKSPACE/.aw_registry/.aw_rules/rule-manifest.json`
2. `$WORKSPACE/.aw_registry/.aw_rules/manifest.json` (legacy)
3. `~/.aw/.aw_registry/.aw_rules/rule-manifest.json`
4. `~/.aw/.aw_registry/.aw_rules/manifest.json` (legacy)

Set `AW_RULES_WORKSPACE_ROOT` to override the workspace root.

## Domain Detection

Files are mapped to domains by path patterns:

| Domain | Matched by |
|--------|-----------|
| `infra` | `helm/`, `terraform/`, `Dockerfile`, `Jenkinsfile` |
| `sdet` | `e2e/`, `playwright/` (E2E tests only — not unit/integration specs) |
| `mobile` | `*.dart`, `lib/` |
| `frontend` | `*.vue`, `composables/`, `components/*.ts`, `stores/` |
| `data` | `*.schema.ts`, `*.migration.*`, `*.repository.ts` |
| `api-design` | `*.controller.ts`, `dto/`, `*.client.ts` |
| `backend` | `*.service.ts`, `*.module.ts`, `*.worker.ts`, or any file with "worker" in its name |

**Unit/integration test files** (`__tests__/**/*.spec.ts`) inherit the domain of their parent module, not `sdet`. The `sdet` domain is reserved for E2E/Playwright tests only.

Rules with `domains: ["all"]` apply to every file. Rules with `stacks` (e.g. `nestjs`, `vue`) only match files detected as that stack.

## Review Procedure

1. Run the script with the appropriate mode flag
2. Open the generated worksheet
3. Review files in batches
4. Replace `TODO` with: `pass`, `fail`, `unknown`, or `not_applicable`
5. Add concise notes only for failures, unknowns, or meaningful exemptions

## Expected Output

Default: `.aw_docs/skill-tests/aw-rules-review.md`

## CLI Reference

```
Usage: generate-review-template.mjs [options]

Modes (pick one):
  --pr <number>        Review files changed in a GitHub PR (requires gh CLI)
  --diff               Review files changed vs the current branch's merge-base
  --base <ref>         Base ref for --diff mode (default: auto-detected main/master)
  --files <glob,...>   Review an explicit comma-separated list of files
  (no flag)            Review all tracked files in the repo

Options:
  --out, -o <path>     Output worksheet path
  --help, -h           Show this help
```

## Important Limits

- The script does not decide pass/fail automatically
- Semantic rules still need AI or human review
- Domain detection is path-based — files outside standard paths get only universal rules
- This skill is intentionally standalone and should not call the existing workspace review command
