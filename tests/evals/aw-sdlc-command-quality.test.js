const assert = require('assert');
const path = require('path');
const { createRepoSnapshot } = require('./lib/repo-snapshot');
const { REPO_ROOT } = require('./lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const REQUIRED_FRONTMATTER = ['name', 'description', 'argument-hint', 'status', 'stage'];

const COMMAND_QUALITY = [
  {
    command: 'plan',
    status: 'active',
    sections: ['## Role', '## Modes', '## Required Inputs', '## Optional Inputs', '## Outputs', '## Hard Gates', '## Must Not Do', '## Internal Routing', '## Final Output Shape'],
  },
  {
    command: 'execute',
    status: 'active',
    sections: ['## Role', '## Modes', '## Required Inputs', '## Optional Inputs', '## Outputs', '## Hard Gates', '## Must Not Do', '## Internal Routing', '## Final Output Shape'],
  },
  {
    command: 'verify',
    status: 'active',
    sections: ['## Role', '## Modes', '## Required Inputs', '## Optional Inputs', '## Outputs', '## Verify Layers', '## Hard Gates', '## Must Not Do', '## Internal Routing', '## Final Output Shape'],
  },
  {
    command: 'deploy',
    status: 'active',
    sections: ['## Role', '## Modes', '## Required Inputs', '## Optional Inputs', '## Outputs', '## Deploy Layers', '## Hard Gates', '## Must Not Do', '## Internal Routing', '## Final Output Shape'],
  },
  {
    command: 'ship',
    status: 'active',
    sections: ['## Role', '## Modes', '## Required Inputs', '## Optional Inputs', '## Outputs', '## Phases', '## Hard Gates', '## Must Not Do', '## Internal Routing', '## Final Output Shape'],
  },
];

function parseFrontmatter(content) {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const match = normalizedContent.match(/^---\n([\s\S]*?)\n---\n/);
  const attributes = {};
  if (!match) return attributes;

  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    attributes[key] = value;
  }

  return attributes;
}

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS ${name}`);
    return true;
  } catch (error) {
    console.log(`  FAIL ${name}`);
    console.log(`    ${error.message}`);
    return false;
  }
}

function run() {
  console.log(`\n=== AW SDLC Command Quality (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  for (const entry of COMMAND_QUALITY) {
    const filePath = path.join('commands', `${entry.command}.md`);
    if (test(`${entry.command} has complete command-quality structure`, () => {
      assert.ok(snapshot.fileExists(filePath), `Missing ${filePath}`);
      const content = snapshot.readFile(filePath);
      const frontmatter = parseFrontmatter(content);

      for (const key of REQUIRED_FRONTMATTER) {
        assert.ok(frontmatter[key], `${entry.command} is missing frontmatter field ${key}`);
      }

      assert.strictEqual(frontmatter.status, entry.status, `${entry.command} should be ${entry.status}`);

      for (const section of entry.sections) {
        assert.ok(content.includes(section), `${entry.command} is missing section ${section}`);
      }
    })) passed++; else failed++;
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
