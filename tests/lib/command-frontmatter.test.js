/**
 * Tests for scripts/lib/command-frontmatter.js
 *
 * Run with: node tests/lib/command-frontmatter.test.js
 */

const assert = require('assert');
const path = require('path');

const {
  VALID_COMMAND_STATUS,
  VALID_FORWARD_MODES,
  parseCommandFrontmatter,
} = require(path.join(__dirname, '..', '..', 'scripts', 'lib', 'command-frontmatter'));

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing command-frontmatter.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('parses command metadata frontmatter', () => {
    const input = [
      '---',
      'description: Example command',
      'status: alias',
      'replacement: /aw:brainstorm',
      'forwardMode: silent',
      '---',
      '',
      '# Body',
    ].join('\n');

    const result = parseCommandFrontmatter(input);
    assert.strictEqual(result.hasFrontmatter, true);
    assert.strictEqual(result.attributes.description, 'Example command');
    assert.strictEqual(result.attributes.status, 'alias');
    assert.strictEqual(result.attributes.replacement, '/aw:brainstorm');
    assert.strictEqual(result.attributes.forwardMode, 'silent');
    assert.ok(result.body.includes('# Body'));
  })) passed++; else failed++;

  if (test('returns empty attributes when frontmatter is missing', () => {
    const result = parseCommandFrontmatter('# Plain body');
    assert.strictEqual(result.hasFrontmatter, false);
    assert.deepStrictEqual(result.attributes, {});
    assert.strictEqual(result.body, '# Plain body');
  })) passed++; else failed++;

  if (test('exposes valid status and forward mode enums', () => {
    assert.ok(VALID_COMMAND_STATUS.has('active'));
    assert.ok(VALID_COMMAND_STATUS.has('alias'));
    assert.ok(VALID_COMMAND_STATUS.has('deprecated'));
    assert.ok(VALID_FORWARD_MODES.has('silent'));
    assert.ok(VALID_FORWARD_MODES.has('warn'));
    assert.ok(VALID_FORWARD_MODES.has('stop'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
