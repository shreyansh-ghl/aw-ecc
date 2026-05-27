#!/usr/bin/env node
/**
 * Executes a hook script only when enabled by ECC hook profile flags.
 *
 * Usage:
 *   node run-with-flags.js <hookId> <scriptRelativePath> [profilesCsv]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { isHookEnabled } = require('../lib/hook-flags');
const {
  isToolHookInputEventStdout,
  normalizeToolHookStdout,
  writeToolHookStdout,
} = require('../lib/hook-stdout');

const MAX_STDIN = 1024 * 1024;

function readStdinRaw() {
  return new Promise(resolve => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (raw.length < MAX_STDIN) {
        const remaining = MAX_STDIN - raw.length;
        raw += chunk.substring(0, remaining);
      }
    });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', () => resolve(raw));
  });
}

function getPluginRoot() {
  if (process.env.CLAUDE_PLUGIN_ROOT && process.env.CLAUDE_PLUGIN_ROOT.trim()) {
    return process.env.CLAUDE_PLUGIN_ROOT;
  }
  return path.resolve(__dirname, '..', '..');
}

function appendLine(value) {
  const text = String(value || '');
  if (!text) return;
  process.stderr.write(text.endsWith('\n') ? text : `${text}\n`);
}

function writeRunResult(output, fallbackRaw) {
  if (output && typeof output === 'object' && !Buffer.isBuffer(output)) {
    if (output.stderr) appendLine(output.stderr);
    if (Array.isArray(output.logs)) output.logs.forEach(appendLine);

    const stdout = output.stdout ?? output.output ?? output.response;
    writeToolHookStdout(stdout !== undefined ? stdout : output);
    return Number.isInteger(output.exitCode) ? output.exitCode : 0;
  }

  writeToolHookStdout(output !== null && output !== undefined ? output : fallbackRaw);
  return 0;
}

function writeChildResultStdout(stdout, fallbackRaw, exitCode) {
  const normalized = normalizeToolHookStdout(stdout || fallbackRaw);
  if (exitCode !== 0 && stdout && normalized === '{}' && !isToolHookInputEventStdout(stdout)) {
    appendLine(stdout);
  }
  process.stdout.write(normalized);
}

async function main() {
  const [, , hookId, relScriptPath, profilesCsv] = process.argv;
  const raw = await readStdinRaw();

  if (!hookId || !relScriptPath) {
    writeToolHookStdout(raw);
    process.exit(0);
  }

  if (!isHookEnabled(hookId, { profiles: profilesCsv })) {
    writeToolHookStdout(raw);
    process.exit(0);
  }

  const pluginRoot = getPluginRoot();
  const resolvedRoot = path.resolve(pluginRoot);
  const scriptPath = path.resolve(pluginRoot, relScriptPath);

  // Prevent path traversal outside the plugin root
  if (!scriptPath.startsWith(resolvedRoot + path.sep)) {
    process.stderr.write(`[Hook] Path traversal rejected for ${hookId}: ${scriptPath}\n`);
    writeToolHookStdout(raw);
    process.exit(0);
  }

  if (!fs.existsSync(scriptPath)) {
    process.stderr.write(`[Hook] Script not found for ${hookId}: ${scriptPath}\n`);
    writeToolHookStdout(raw);
    process.exit(0);
  }

  // Prefer direct require() when the hook exports a run(rawInput) function.
  // This eliminates one Node.js process spawn (~50-100ms savings per hook).
  //
  // SAFETY: Only require() hooks that export run(). Legacy hooks execute
  // side effects at module scope (stdin listeners, process.exit, main() calls)
  // which would interfere with the parent process or cause double execution.
  let hookModule;
  const src = fs.readFileSync(scriptPath, 'utf8');
  const hasRunExport = /\bmodule\.exports\b/.test(src) && /\brun\b/.test(src);

  if (hasRunExport) {
    try {
      hookModule = require(scriptPath);
    } catch (requireErr) {
      process.stderr.write(`[Hook] require() failed for ${hookId}: ${requireErr.message}\n`);
      // Fall through to legacy spawnSync path
    }
  }

  if (hookModule && typeof hookModule.run === 'function') {
    let code = 0;
    try {
      const output = hookModule.run(raw);
      code = writeRunResult(output, raw);
    } catch (runErr) {
      process.stderr.write(`[Hook] run() error for ${hookId}: ${runErr.message}\n`);
      writeToolHookStdout(raw);
    }
    process.exit(code);
  }

  // Legacy path: spawn a child Node process for hooks without run() export
  const result = spawnSync('node', [scriptPath], {
    input: raw,
    encoding: 'utf8',
    env: process.env,
    cwd: process.cwd(),
    timeout: 30000
  });

  const code = Number.isInteger(result.status) ? result.status : 0;
  writeChildResultStdout(result.stdout, raw, code);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(code);
}

main().catch(err => {
  process.stderr.write(`[Hook] run-with-flags error: ${err.message}\n`);
  writeToolHookStdout('{}');
  process.exit(0);
});
