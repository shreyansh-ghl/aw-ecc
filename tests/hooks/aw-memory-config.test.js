/**
 * Tests for scripts/hooks/aw-memory-config.js
 *
 * Run with: node tests/hooks/aw-memory-config.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  DEFAULT_MCP_URL,
  getAwMemoryHookConfig,
  isMemoryHooksEnabled,
  redactConfigForLog,
} = require('../../scripts/hooks/aw-memory-config');

function test(name, fn) {
  try {
    fn();
    console.log(`  ok ${name}`);
    return true;
  } catch (err) {
    console.log(`  fail ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function createTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-config-'));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function runTests() {
  console.log('\n=== Testing aw-memory-config.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('enables recall and sync by default with the prod MCP URL', () => {
    const home = createTempHome();
    try {
      const config = getAwMemoryHookConfig({}, fs, home);

      assert.strictEqual(config.enabled, true);
      assert.strictEqual(config.recallEnabled, true);
      assert.strictEqual(config.syncEnabled, true);
      assert.strictEqual(config.timeoutMs, 800);
      assert.strictEqual(config.maxResults, 3);
      assert.strictEqual(config.syncMaxPerRun, 5);
      assert.strictEqual(config.mcp.url, DEFAULT_MCP_URL);
      assert.strictEqual(config.mcp.source, 'default');
      assert.strictEqual(isMemoryHooksEnabled(config), true);
    } finally {
      cleanup(home);
    }
  })) passed++; else failed++;

  if (test('persistent preferences can still disable memory hooks', () => {
    const home = createTempHome();
    try {
      writeJson(path.join(home, '.aw', 'memory-hooks-preferences.json'), {
        mode: 'disabled',
      });

      const config = getAwMemoryHookConfig({}, fs, home);

      assert.strictEqual(config.enabled, false);
      assert.strictEqual(config.recallEnabled, false);
      assert.strictEqual(config.syncEnabled, false);
      assert.strictEqual(isMemoryHooksEnabled(config), false);
    } finally {
      cleanup(home);
    }
  })) passed++; else failed++;

  if (test('reads non-secret persistent preferences from ~/.aw/memory-hooks-preferences.json', () => {
    const home = createTempHome();
    try {
      writeJson(path.join(home, '.aw', 'memory-hooks-preferences.json'), {
        mode: 'enabled',
        recall: true,
        sync: false,
        cursorPromptInjection: true,
        timeoutMs: 1200,
        maxResults: 6,
        syncMaxPerRun: 9,
      });

      const config = getAwMemoryHookConfig({}, fs, home);

      assert.strictEqual(config.enabled, true);
      assert.strictEqual(config.recallEnabled, true);
      assert.strictEqual(config.syncEnabled, false);
      assert.strictEqual(config.cursorPromptInjectionEnabled, true);
      assert.strictEqual(config.timeoutMs, 1200);
      assert.strictEqual(config.maxResults, 6);
      assert.strictEqual(config.syncMaxPerRun, 9);
    } finally {
      cleanup(home);
    }
  })) passed++; else failed++;

  if (test('environment flags override persistent preferences', () => {
    const home = createTempHome();
    try {
      writeJson(path.join(home, '.aw', 'memory-hooks-preferences.json'), {
        mode: 'disabled',
        recall: false,
        sync: false,
        timeoutMs: 1200,
        maxResults: 6,
        syncMaxPerRun: 9,
      });

      const config = getAwMemoryHookConfig({
        AW_MEMORY_HOOKS: '1',
        AW_MEMORY_RECALL: '1',
        AW_MEMORY_SYNC: '1',
        AW_MEMORY_CURSOR_PROMPT_INJECTION: '1',
        AW_MEMORY_HOOK_TIMEOUT_MS: '50',
        AW_MEMORY_MAX_RESULTS: '500',
        AW_MEMORY_SYNC_MAX_PER_RUN: '500',
      }, fs, home);

      assert.strictEqual(config.enabled, true);
      assert.strictEqual(config.recallEnabled, true);
      assert.strictEqual(config.syncEnabled, true);
      assert.strictEqual(config.cursorPromptInjectionEnabled, true);
      assert.strictEqual(config.timeoutMs, 100);
      assert.strictEqual(config.maxResults, 10);
      assert.strictEqual(config.syncMaxPerRun, 25);
    } finally {
      cleanup(home);
    }
  })) passed++; else failed++;

  if (test('reads namespace from workspace .aw/.aw_registry/.sync-config.json', () => {
    const home = createTempHome();
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-config-workspace-'));
    try {
      writeJson(path.join(workspace, '.aw', '.aw_registry', '.sync-config.json'), {
        namespace: 'revex/courses',
        repo: 'GoHighLevel/platform-docs',
      });

      const config = getAwMemoryHookConfig({}, fs, home, workspace);

      assert.strictEqual(config.namespace, 'revex/courses');
      assert.strictEqual(
        config.namespaceSource,
        path.join(workspace, '.aw', '.aw_registry', '.sync-config.json')
      );
    } finally {
      cleanup(home);
      cleanup(workspace);
    }
  })) passed++; else failed++;

  if (test('uses included team namespace when sync config namespace is platform', () => {
    const home = createTempHome();
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-config-workspace-'));
    try {
      writeJson(path.join(workspace, '.aw', '.aw_registry', '.sync-config.json'), {
        namespace: 'platform',
        repo: 'GoHighLevel/platform-docs',
        include: ['revex/courses'],
      });

      const config = getAwMemoryHookConfig({}, fs, home, workspace);

      assert.strictEqual(config.namespace, 'revex/courses');
      assert.strictEqual(
        config.namespaceSource,
        path.join(workspace, '.aw', '.aw_registry', '.sync-config.json')
      );
    } finally {
      cleanup(home);
      cleanup(workspace);
    }
  })) passed++; else failed++;

  if (test('environment namespace and MCP URL override defaults for staging', () => {
    const home = createTempHome();
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-config-workspace-'));
    try {
      writeJson(path.join(workspace, '.aw', '.aw_registry', '.sync-config.json'), {
        namespace: 'platform',
      });

      const config = getAwMemoryHookConfig({
        AW_MEMORY_NAMESPACE: 'revex/courses',
        AW_MEMORY_MCP_URL: 'https://staging.backend.leadconnectorhq.com/agentic-workspace/mcp',
      }, fs, home, workspace);

      assert.strictEqual(config.namespace, 'revex/courses');
      assert.strictEqual(config.namespaceSource, 'env');
      assert.strictEqual(config.mcp.url, 'https://staging.backend.leadconnectorhq.com/agentic-workspace/mcp');
      assert.strictEqual(config.mcp.source, 'env');
    } finally {
      cleanup(home);
      cleanup(workspace);
    }
  })) passed++; else failed++;

  if (test('resolves existing MCP config and keeps auth out of log metadata', () => {
    const home = createTempHome();
    try {
      writeJson(path.join(home, '.claude.json'), {
        mcpServers: {
          'ghl-ai': {
            url: 'https://services.example.test/agentic-workspace/mcp',
            headers: {
              Authorization: 'Bearer super-secret-token',
            },
          },
        },
      });

      const config = getAwMemoryHookConfig({ AW_MEMORY_HOOKS: '1' }, fs, home);
      const redacted = redactConfigForLog(config);

      assert.strictEqual(config.mcp.url, 'https://services.example.test/agentic-workspace/mcp');
      assert.strictEqual(config.mcp.authHeaders.Authorization, 'Bearer super-secret-token');
      assert.strictEqual(redacted.mcp.hasAuth, true);
      assert.ok(!JSON.stringify(redacted).includes('super-secret-token'));
      assert.ok(!JSON.stringify(redacted).includes('Authorization'));
    } finally {
      cleanup(home);
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
