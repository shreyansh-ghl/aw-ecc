const assert = require('assert');
const path = require('path');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const REQUIRED_FRONTMATTER = ['name', 'description', 'argument-hint', 'status', 'stage'];

const COMMAND_QUALITY = [
  {
    command: 'plan',
    status: 'active',
    stage: 'plan',
    sections: ['## Role', '## Modes', '## Required Inputs', '## Optional Inputs', '## Outputs', '## Hard Gates', '## Must Not Do', '## Internal Routing', '## Final Output Shape'],
  },
  {
    command: 'build',
    status: 'active',
    stage: 'build',
    sections: ['## Role', '## Modes', '## Required Inputs', '## Outputs', '## Execution Rules', '## Must Not Do', '## Recommended Next Commands', '## Final Output Shape'],
  },
  {
    command: 'investigate',
    status: 'active',
    stage: 'investigate',
    sections: ['## Role', '## Modes', '## Outputs', '## Investigation Rules', '## Must Not Do', '## Recommended Next Commands', '## Final Output Shape'],
  },
  {
    command: 'test',
    status: 'active',
    stage: 'test',
    sections: ['## Role', '## Modes', '## Outputs', '## QA Rules', '## Must Not Do', '## Recommended Next Commands', '## Final Output Shape'],
  },
  {
    command: 'review',
    status: 'active',
    stage: 'review',
    sections: ['## Role', '## Modes', '## Outputs', '## Review Rules', '## Must Not Do', '## Recommended Next Commands', '## Final Output Shape'],
  },
  {
    command: 'deploy',
    status: 'active',
    stage: 'deploy',
    sections: ['## Role', '## Modes', '## Required Inputs', '## Outputs', '## Deploy Rules', '## Must Not Do', '## Recommended Next Commands', '## Final Output Shape'],
  },
  {
    command: 'ship',
    status: 'active',
    stage: 'ship',
    sections: ['## Role', '## Modes', '## Required Inputs', '## Outputs', '## Shipping Rules', '## Must Not Do', '## Recommended Next Commands', '## Final Output Shape'],
  },
  {
    command: 'execute',
    status: 'active',
    stage: 'compatibility',
    sections: ['## Role', '## Routing Rule', '## Outputs', '## Must Not Do', '## Recommended Next Commands', '## Final Output Shape'],
  },
  {
    command: 'verify',
    status: 'active',
    stage: 'compatibility',
    sections: ['## Role', '## Compatibility Mapping', '## Outputs', '## Must Not Do', '## Recommended Next Commands', '## Final Output Shape'],
  },
];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
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
      assert.strictEqual(frontmatter.stage, entry.stage, `${entry.command} should declare stage ${entry.stage}`);

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
