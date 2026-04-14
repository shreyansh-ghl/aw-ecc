#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values: flags, positionals } = parseArgs({
  options: {
    pr:    { type: 'string',  short: 'p' },
    diff:  { type: 'boolean', short: 'd', default: false },
    files: { type: 'string',  short: 'f' },
    base:  { type: 'string',  short: 'b' },
    out:   { type: 'string',  short: 'o' },
    help:  { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
  allowPositionals: true,
});

if (flags.help) {
  console.log(`
Usage: generate-review-template.mjs [options]

Modes (pick one):
  --pr <number>        Review files changed in a GitHub PR (requires gh CLI)
  --diff               Review files changed vs the current branch's merge-base
  --base <ref>         Base ref for --diff mode (default: auto-detected main/master)
  --files <glob,...>   Review an explicit comma-separated list of files
  (no flag)            Review all tracked files in the repo

Options:
  --out, -o <path>     Output worksheet path (default: .aw_docs/skill-tests/aw-rules-review.md)
  --help, -h           Show this help
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const workspaceRoot = process.env.AW_RULES_WORKSPACE_ROOT
  ? path.resolve(process.env.AW_RULES_WORKSPACE_ROOT)
  : process.cwd();

const defaultOutputPath = path.join(
  workspaceRoot, '.aw_docs', 'skill-tests', 'aw-rules-review.md',
);
const outputPath = flags.out
  ? path.resolve(workspaceRoot, flags.out)
  : defaultOutputPath;

// ---------------------------------------------------------------------------
// Locate rule-manifest.json (try workspace first, then global ~/.aw)
// ---------------------------------------------------------------------------

const MANIFEST_CANDIDATES = [
  path.join(workspaceRoot, '.aw_registry', '.aw_rules', 'rule-manifest.json'),
  path.join(workspaceRoot, '.aw_registry', '.aw_rules', 'manifest.json'),
  path.join(process.env.HOME, '.aw', '.aw_registry', '.aw_rules', 'rule-manifest.json'),
  path.join(process.env.HOME, '.aw', '.aw_registry', '.aw_rules', 'manifest.json'),
];

function findManifest() {
  for (const candidate of MANIFEST_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  console.error(
    'ERROR: Could not find rule-manifest.json in any of:\n' +
    MANIFEST_CANDIDATES.map((p) => `  - ${p}`).join('\n'),
  );
  process.exit(1);
}

const manifestPath = findManifest();
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const rulesById = new Map(manifest.rules.map((r) => [r.id, r]));

console.log(`Manifest: ${manifestPath} (${manifest.rules.length} rules)`);

// ---------------------------------------------------------------------------
// Domain detection — maps file paths to manifest domains
// ---------------------------------------------------------------------------

const DOMAIN_PATTERNS = [
  // infra
  { test: (f) => /\/(helm|terraform)\//i.test(f) || /Dockerfile|Jenkinsfile/i.test(f), domain: 'infra' },
  // sdet / e2e only (not unit/integration specs)
  { test: (f) => /\/(e2e|playwright)\//i.test(f), domain: 'sdet' },
  // mobile / flutter
  { test: (f) => /\.dart$/.test(f) || /\/lib\//.test(f), domain: 'mobile' },
  // frontend
  { test: (f) => /\.vue$/.test(f) || /composables?\//.test(f) || /\/components\/.*\.ts$/.test(f) || /stores?\//.test(f), domain: 'frontend' },
  // data
  { test: (f) => /\.schema\.ts$/.test(f) || /\.migration\./.test(f) || /\.repository\.ts$/.test(f), domain: 'data' },
  // api-design
  { test: (f) => /\.controller\.ts$/.test(f) || /\/dto\//.test(f) || /\.client\.ts$/.test(f), domain: 'api-design' },
  // backend (broad — services, modules, workers, and files with "worker" in the name)
  { test: (f) => /\.(service|module|worker)\.ts$/.test(f) || /worker/i.test(path.basename(f)), domain: 'backend' },
];

function isUnitOrIntegrationTest(filePath) {
  return /__tests__\//.test(filePath) && /\.spec\.ts$/.test(filePath) && !/\/(e2e|playwright)\//.test(filePath);
}

function detectDomains(filePath) {
  const domains = new Set();

  // Unit/integration test files inherit the domain of the code they test,
  // not sdet (which is for E2E/Playwright only). Detect from parent path.
  if (isUnitOrIntegrationTest(filePath)) {
    // Strip __tests__/... suffix and re-detect based on the parent module path
    const parentPath = filePath.replace(/__tests__\/.*$/, '');
    // Check if parent contains service/schema/controller/worker patterns
    // but also tag as backend by default since unit tests live in backend modules
    for (const { test, domain } of DOMAIN_PATTERNS) {
      if (test(parentPath)) domains.add(domain);
    }
    if (domains.size === 0) domains.add('backend');
    return [...domains];
  }

  for (const { test, domain } of DOMAIN_PATTERNS) {
    if (test(filePath)) domains.add(domain);
  }
  // Controllers belong to both api-design and backend
  if (domains.has('api-design')) domains.add('backend');
  // Schemas belong to both data and backend
  if (domains.has('data')) domains.add('backend');
  // If nothing matched, tag as general (universal rules still apply)
  if (domains.size === 0) domains.add('_general');
  return [...domains];
}

// ---------------------------------------------------------------------------
// Stack detection
// ---------------------------------------------------------------------------

function detectStacks(filePath) {
  const stacks = new Set();
  if (/\.vue$/.test(filePath) || /composables?\//.test(filePath)) stacks.add('vue');
  if (/\/nuxt\.config|\.nuxt\/|\/server\/api\//.test(filePath)) stacks.add('nuxt');
  if (/\.module\.ts$/.test(filePath) || /\.controller\.ts$/.test(filePath) || /\/dto\//.test(filePath)) stacks.add('nestjs');
  if (/\.go$/.test(filePath)) stacks.add('go-connect');
  return [...stacks];
}

// ---------------------------------------------------------------------------
// Rule matching
// ---------------------------------------------------------------------------

function applicableRules(filePath) {
  const fileDomains = detectDomains(filePath);
  const fileStacks = detectStacks(filePath);

  return manifest.rules.filter((rule) => {
    // Domain match: rule applies to "all" or overlaps with file domains
    const domainMatch = rule.domains.includes('all') ||
      rule.domains.some((d) => fileDomains.includes(d));
    if (!domainMatch) return false;

    // Stack match: if rule specifies stacks, file must match at least one
    if (rule.stacks && rule.stacks.length > 0) {
      return rule.stacks.some((s) => fileStacks.includes(s));
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// File collection — depends on mode
// ---------------------------------------------------------------------------

function sh(cmd) {
  return execSync(cmd, { cwd: workspaceRoot, encoding: 'utf8' }).trim();
}

function getFilesFromPR(prNumber) {
  const json = sh(`gh api "repos/{owner}/{repo}/pulls/${prNumber}/files?per_page=100"`);
  const files = JSON.parse(json);
  return files.map((f) => f.filename).filter(Boolean);
}

function getFilesFromDiff(baseRef) {
  const base = baseRef || detectBaseRef();
  const mergeBase = sh(`git merge-base ${base} HEAD`);
  return sh(`git diff --name-only ${mergeBase}`)
    .split('\n')
    .filter(Boolean);
}

function detectBaseRef() {
  // Detect the default branch from the remote HEAD
  try {
    const symRef = sh('git symbolic-ref refs/remotes/origin/HEAD');
    return symRef.replace('refs/remotes/', '');
  } catch { /* ignore */ }
  // Fallback: try common names
  for (const ref of ['origin/main', 'origin/master', 'main', 'master']) {
    try { sh(`git rev-parse --verify ${ref}`); return ref; } catch { /* ignore */ }
  }
  return 'master';
}

function getFilesFromList(csv) {
  return csv.split(',').map((f) => f.trim()).filter(Boolean);
}

function getAllTrackedFiles() {
  return sh('git ls-files')
    .split('\n')
    .filter(Boolean);
}

function collectFiles() {
  if (flags.pr) {
    console.log(`Mode: PR #${flags.pr}`);
    return getFilesFromPR(flags.pr);
  }
  if (flags.diff) {
    const base = flags.base || detectBaseRef();
    console.log(`Mode: diff vs ${base}`);
    return getFilesFromDiff(base);
  }
  if (flags.files) {
    console.log(`Mode: explicit file list`);
    return getFilesFromList(flags.files);
  }
  console.log('Mode: all tracked files');
  return getAllTrackedFiles();
}

// Filter to source files only (skip assets, configs, lockfiles, etc.)
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.vue', '.dart', '.go', '.yaml', '.yml',
  '.tf', '.hcl', '.md', '.json', '.mjs', '.cjs',
]);

function isSourceFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (SOURCE_EXTENSIONS.has(ext)) return true;
  // Dockerfile, Jenkinsfile (no extension)
  const base = path.basename(filePath);
  return /^(Dockerfile|Jenkinsfile)/i.test(base);
}

// ---------------------------------------------------------------------------
// Generate worksheet
// ---------------------------------------------------------------------------

const files = collectFiles().filter(isSourceFile);
console.log(`Files to review: ${files.length}`);

if (files.length === 0) {
  console.log('No source files found for the selected mode. Nothing to generate.');
  process.exit(0);
}

const modeLabel = flags.pr
  ? `PR #${flags.pr}`
  : flags.diff
    ? `diff vs ${flags.base || 'auto-detected base'}`
    : flags.files
      ? 'explicit file list'
      : 'all tracked files';

const sections = files.map((filePath) => {
  const rules = applicableRules(filePath);
  const domains = detectDomains(filePath);
  const stacks = detectStacks(filePath);

  const ruleLines = rules.length === 0
    ? ['- No applicable manifest rules']
    : rules.map((rule) => {
        return `- [ ] \`${rule.id}\` | severity: \`${rule.severity}\` | status: \`TODO\` | ${rule.description}`;
      });

  const domainTag = domains.join(', ');
  const stackTag = stacks.length > 0 ? ` | stacks: \`${stacks.join(', ')}\`` : '';

  return `## \`${filePath}\`

- Domains: \`${domainTag}\`${stackTag}
- Applicable rules: \`${rules.length}\`

${ruleLines.join('\n')}
`;
});

const output = `# AW Rules Review Worksheet

- Mode: **${modeLabel}**
- Workspace: \`${workspaceRoot}\`
- Manifest: \`${manifestPath}\`
- Total rules: \`${manifest.rules.length}\`
- Files in worksheet: \`${files.length}\`
- Generated: \`${new Date().toISOString()}\`

## Status legend

| Status | Meaning |
|--------|---------|
| \`pass\` | Rule satisfied |
| \`fail\` | Rule violated — add note |
| \`unknown\` | Cannot determine — add note |
| \`not_applicable\` | Rule does not apply to this file context |

---

${sections.join('\n')}
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
console.log(`Worksheet written to: ${outputPath}`);
