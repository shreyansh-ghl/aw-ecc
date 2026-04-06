const assert = require('assert');
const { readFileSync } = require('fs');
const { COMMAND_CONTRACTS_PATH } = require('../lib/aw-sdlc-paths');

const REQUIRED_SECTIONS = [
  '### Role',
  '### Stage',
  '### Modes',
  '### Required Inputs',
  '### Optional Inputs',
  '### Outputs',
  '### Layers',
  '### Hard Gates',
  '### Must Not Do',
  '### Next Commands',
];

const COMMANDS = [
  '/aw:plan',
  '/aw:build',
  '/aw:investigate',
  '/aw:test',
  '/aw:review',
  '/aw:deploy',
  '/aw:ship',
];

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

function extractSection(documentText, commandName) {
  const escaped = commandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`## \\d+\\. \`${escaped}\`([\\s\\S]*?)(?=\\n## \\d+\\. \`/aw:|\\n## Internal and Compatibility Commands|$)`);
  const match = documentText.match(regex);
  return match ? match[1] : '';
}

function run() {
  console.log('\n=== AW SDLC Command Contract Completeness ===\n');

  const content = readFileSync(COMMAND_CONTRACTS_PATH, 'utf8');
  let passed = 0;
  let failed = 0;

  if (test('responsibility completeness rule exists', () => {
    assert.ok(content.includes('## Responsibility Completeness Rule'));
    assert.ok(content.includes('A command has complete responsibility only if it fully answers all of these questions'));
  })) passed++; else failed++;

  for (const commandName of COMMANDS) {
    if (test(`${commandName} defines all required responsibility sections`, () => {
      const section = extractSection(content, commandName);
      assert.ok(section, `Could not find contract section for ${commandName}`);

      for (const requiredSection of REQUIRED_SECTIONS) {
        assert.ok(
          section.includes(requiredSection),
          `${commandName} is missing section "${requiredSection}"`
        );
      }
    })) passed++; else failed++;
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
