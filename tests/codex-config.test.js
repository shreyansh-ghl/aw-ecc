/**
 * Tests for `.codex/config.toml` reference defaults.
 *
 * Run with: node tests/codex-config.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

const repoRoot = path.join(__dirname, '..');
const configPath = path.join(repoRoot, '.codex', 'config.toml');
const config = fs.readFileSync(configPath, 'utf8');
const codexAgentsDir = path.join(repoRoot, '.codex', 'agents');

let passed = 0;
let failed = 0;

if (
  test('reference config does not pin a top-level model', () => {
    assert.ok(!/^model\s*=/m.test(config), 'Expected `.codex/config.toml` to inherit the CLI default model');
  })
)
  passed++;
else failed++;

if (
  test('reference config does not pin a top-level model provider', () => {
    assert.ok(
      !/^model_provider\s*=/m.test(config),
      'Expected `.codex/config.toml` to inherit the CLI default provider',
    );
  })
)
  passed++;
else failed++;

if (
  test('sample Codex role configs do not use o4-mini', () => {
    const roleFiles = fs.readdirSync(codexAgentsDir).filter(file => file.endsWith('.toml'));
    assert.ok(roleFiles.length > 0, 'Expected sample role config files under `.codex/agents`');

    for (const roleFile of roleFiles) {
      const rolePath = path.join(codexAgentsDir, roleFile);
      const roleConfig = fs.readFileSync(rolePath, 'utf8');
      assert.ok(
        !/^model\s*=\s*"o4-mini"$/m.test(roleConfig),
        `Expected sample role config to avoid o4-mini: ${roleFile}`,
      );
    }
  })
)
  passed++;
else failed++;

if (
  test('reference config registers Echo with a Codex-valid role name', () => {
    const echoPath = path.join(codexAgentsDir, 'echo.toml');

    assert.ok(fs.existsSync(echoPath), 'Expected `.codex/agents/echo.toml` to exist');
    assert.ok(config.includes('[agents.echo]'), 'Expected `[agents.echo]` in `.codex/config.toml`');
    assert.ok(!config.includes('[agents."aw:echo"]'), 'Expected no invalid `[agents."aw:echo"]` alias');
    assert.ok(
      config.includes('config_file = "agents/echo.toml"'),
      'Expected Echo role to point at `agents/echo.toml`',
    );

    const echoConfig = fs.readFileSync(echoPath, 'utf8');
    assert.ok(echoConfig.includes('You are aw:echo'), 'Expected Echo config to identify the aw:echo role');
    assert.ok(
      !/\/Users\/[^/\s]+/.test(echoConfig),
      'Expected Echo config to avoid user-specific absolute paths',
    );
  })
)
  passed++;
else failed++;

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
