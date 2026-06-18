/**
 * End-to-end local proof for AW Memory hooks.
 *
 * This test starts a real local HTTP JSON-RPC MCP endpoint, then runs the
 * actual hook entrypoints as subprocesses. It fails unless the server receives
 * real tools/call requests for memory_search and memory_store.
 *
 * Run with: node tests/hooks/aw-memory-live-e2e.test.js
 */

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(
        () => {
          console.log(`  ok ${name}`);
          return true;
        },
        (error) => {
          console.log(`  not ok ${name}`);
          console.log(`    ${error.stack || error.message}`);
          return false;
        }
      );
    }
    console.log(`  ok ${name}`);
    return true;
  } catch (error) {
    console.log(`  not ok ${name}`);
    console.log(`    ${error.stack || error.message}`);
    return false;
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function startMemoryMcpServer() {
  const requests = [];

  const server = http.createServer(async (request, response) => {
    try {
      const rawBody = await readRequestBody(request);
      const json = JSON.parse(rawBody);
      requests.push({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: json,
      });

      const toolName = json?.params?.name;
      let result;
      if (toolName === 'memory_search') {
        result = {
          results: [
            { text: 'Use AW Memory only for curated, redacted operational guidance.' },
          ],
        };
      } else if (toolName === 'memory_store') {
        result = { stored: true, key: json?.params?.arguments?.key || null };
      } else {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({
          jsonrpc: '2.0',
          id: json?.id || null,
          error: { code: -32601, message: `unknown tool: ${toolName}` },
        }));
        return;
      }

      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        jsonrpc: '2.0',
        id: json?.id || null,
        result,
      }));
    } catch (error) {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: error.message }));
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        url: `http://127.0.0.1:${address.port}/mcp`,
        requests,
        close: () => new Promise((closeResolve) => server.close(closeResolve)),
      });
    });
  });
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || REPO_ROOT,
      env: options.env || process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${command} ${args.join(' ')} timed out`));
    }, options.timeoutMs || 10000);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal, stdout, stderr });
    });
    child.stdin.end(options.input || '');
  });
}

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-live-e2e-workspace-'));
  for (const domain of ['universal', 'security']) {
    const rulesDir = path.join(root, '.aw', '.aw_rules', 'platform', domain);
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'AGENTS.md'), `# ${domain}\n`, 'utf8');
  }
  fs.mkdirSync(path.join(root, '.aw', '.aw_registry'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.aw', '.aw_registry', '.sync-config.json'),
    JSON.stringify({
      namespace: 'local-e2e',
      repo: 'GoHighLevel/platform-docs',
      include: [],
    }, null, 2),
    'utf8'
  );
  fs.mkdirSync(path.join(root, '.aw_docs', 'learnings'), { recursive: true });
  return root;
}

function baseEnv(homeDir, serverUrl) {
  return {
    ...process.env,
    HOME: homeDir,
    AW_MEMORY_MCP_URL: serverUrl,
    AW_MEMORY_HOOK_TIMEOUT_MS: '2500',
    GHL_AI_MCP_BEARER_TOKEN: 'local-e2e-token',
  };
}

function toolCalls(requests, toolName) {
  return requests.filter((entry) => entry.body?.method === 'tools/call'
    && entry.body?.params?.name === toolName);
}

async function runTests() {
  console.log('\n=== Testing AW Memory local live E2E ===\n');

  const results = [];

  results.push(await test('real prompt hook calls memory_search and emits recalled context', async () => {
    const workspace = makeWorkspace();
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-live-e2e-home-'));
    const server = await startMemoryMcpServer();
    try {
      const input = JSON.stringify({
        cwd: workspace,
        workspace_roots: [workspace],
        prompt: 'Use remembered backend guidance. Authorization: Bearer prompt-secret',
      });

      const result = await runProcess(
        'bash',
        [path.join(REPO_ROOT, 'scripts', 'hooks', 'session-start-rules-context.sh')],
        {
          cwd: workspace,
          input,
          env: baseEnv(homeDir, server.url),
        }
      );

      assert.strictEqual(result.status, 0, result.stderr);
      const payload = JSON.parse(result.stdout);
      const context = payload.hookSpecificOutput.additionalContext;
      assert.match(context, /\[AW Router reminder\]/);
      assert.match(context, /AW Memory Recall/);
      assert.match(context, /curated, redacted operational guidance/);

      const searchCalls = toolCalls(server.requests, 'memory_search');
      assert.strictEqual(searchCalls.length, 1);
      assert.strictEqual(searchCalls[0].method, 'POST');
      assert.strictEqual(searchCalls[0].url, '/mcp');
      assert.strictEqual(searchCalls[0].headers.authorization, 'Bearer local-e2e-token');
      assert.strictEqual(searchCalls[0].headers.accept, 'application/json, text/event-stream');
      assert.strictEqual(searchCalls[0].headers['x-namespace'], 'local-e2e');
      assert.strictEqual(searchCalls[0].body.params.arguments.limit, 3);
      assert.strictEqual(searchCalls[0].body.params.arguments.namespace, 'local-e2e');
      assert.match(searchCalls[0].body.params.arguments.query, /Use remembered backend guidance/);
      assert.match(searchCalls[0].body.params.arguments.query, new RegExp(`repo:${path.basename(workspace)}`));
      assert.doesNotMatch(searchCalls[0].body.params.arguments.query, /prompt-secret/);
      assert.doesNotMatch(context, /prompt-secret/);
    } finally {
      await server.close();
      fs.rmSync(workspace, { recursive: true, force: true });
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  }));

  results.push(await test('real session-end hook calls memory_store and writes receipts', async () => {
    const workspace = makeWorkspace();
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-live-e2e-home-'));
    const server = await startMemoryMcpServer();
    try {
      fs.writeFileSync(
        path.join(workspace, '.aw_docs', 'learnings', '_pending-sync.jsonl'),
        `${JSON.stringify({
          id: 'live-e2e-learning',
          text: 'Prefer curated memory sync. Authorization: Bearer sync-secret',
          namespace: 'local-e2e',
          metadata: { route: '/aw:test' },
        })}\n`,
        'utf8'
      );

      const result = await runProcess(
        'node',
        [path.join(REPO_ROOT, 'scripts', 'hooks', 'session-end.js')],
        {
          cwd: workspace,
          input: JSON.stringify({ cwd: workspace, workspace_roots: [workspace] }),
          env: baseEnv(homeDir, server.url),
        }
      );

      assert.strictEqual(result.status, 0, result.stderr);

      const storeCalls = toolCalls(server.requests, 'memory_store');
      assert.strictEqual(storeCalls.length, 1);
      const payload = storeCalls[0].body.params.arguments;
      assert.strictEqual(payload.key, 'live-e2e-learning');
      assert.match(payload.content, /Prefer curated memory sync/);
      assert.doesNotMatch(payload.content, /sync-secret/);
      assert.strictEqual(payload.text, payload.content);
      assert.strictEqual(payload.type, 'learning');
      assert.strictEqual(payload.source, 'hook');
      assert.deepStrictEqual(payload.tags, [
        'aw-memory-hooks',
        'curated-learning',
        `repo:${path.basename(workspace)}`,
      ]);
      assert.strictEqual(payload.scope_level, 'repo');
      assert.strictEqual(payload.repo_slug, path.basename(workspace));
      assert.strictEqual(payload.namespace, 'local-e2e');
      assert.strictEqual(payload.metadata.source, 'aw-learnings');
      assert.strictEqual(payload.metadata.namespace, 'local-e2e');
      assert.strictEqual(payload.metadata.route, '/aw:test');
      assert.strictEqual(payload.metadata.repoName, path.basename(workspace));
      assert.strictEqual(storeCalls[0].headers.authorization, 'Bearer local-e2e-token');
      assert.strictEqual(storeCalls[0].headers.accept, 'application/json, text/event-stream');
      assert.strictEqual(storeCalls[0].headers['x-namespace'], 'local-e2e');

      const receiptPath = path.join(workspace, '.aw_docs', 'cache', 'aw-memory-sync-state.json');
      const receipts = JSON.parse(fs.readFileSync(receiptPath, 'utf8')).receipts;
      assert.strictEqual(receipts['live-e2e-learning'].status, 'stored');
    } finally {
      await server.close();
      fs.rmSync(workspace, { recursive: true, force: true });
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  }));

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;
  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
