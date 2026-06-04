#!/usr/bin/env node
/**
 * Executes a hook script only when enabled by ECC hook profile flags.
 *
 * Usage:
 *   node run-with-flags.js <hookId> <scriptRelativePath> [profilesCsv]
 *
 * Output contract (both Cursor and Claude Code):
 *   - allow / no opinion = empty stdout + exit 0
 *   - block              = exit 2 (reason on stderr), empty stdout
 *
 * The raw input event is NEVER echoed to stdout. Cursor parses non-empty
 * write-path stdout as a decision object; echoing the event (which is valid
 * JSON but not a `{permission|decision|hookSpecificOutput}` shape) makes the
 * harness report "returned invalid JSON" and block the tool call.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { isHookEnabled } = require('../lib/hook-flags');

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

/**
 * Allow / no opinion: empty stdout + exit 0. Never echo the input event.
 */
function allow() {
  process.exit(0);
}

/**
 * Translate an in-process run() return value into the harness contract without
 * ever writing the event or a raw object to stdout.
 *   - object: emit optional logs[] then stderr to process.stderr, then exit with
 *     exitCode (default 0). The decision is carried by the exit code, not stdout.
 *   - string | null | undefined: legacy pass-through echo → dropped → allow.
 */
function finalizeRunResult(output) {
  if (output && typeof output === 'object') {
    if (Array.isArray(output.logs)) {
      for (const line of output.logs) {
        if (line !== null && line !== undefined) process.stderr.write(String(line) + '\n');
      }
    }
    if (output.stderr) process.stderr.write(String(output.stderr) + '\n');
    process.exit(Number.isInteger(output.exitCode) ? output.exitCode : 0);
  }
  // string / null / undefined → pass-through echo; never forward to stdout.
  process.exit(0);
}

/**
 * Detect a child's stdout that is merely the echoed input event so it can be
 * suppressed. A genuine decision object (e.g. {"permission":"deny"}) does not
 * contain these event keys and is preserved.
 */
function isPassthroughEcho(stdout, raw) {
  const trimmed = (stdout || '').trim();
  if (!trimmed) return true;
  if (trimmed === (raw || '').trim()) return true;
  try {
    const parsed = JSON.parse(trimmed);
    if (
      parsed &&
      typeof parsed === 'object' &&
      ('hook_event_name' in parsed || 'tool_name' in parsed || 'tool_input' in parsed)
    ) {
      return true;
    }
  } catch (_err) {
    // Non-JSON stdout that does not match the raw event is treated as genuine.
  }
  return false;
}

async function main() {
  const [, , hookId, relScriptPath, profilesCsv] = process.argv;
  const raw = await readStdinRaw();

  if (!hookId || !relScriptPath) {
    allow();
  }

  if (!isHookEnabled(hookId, { profiles: profilesCsv })) {
    allow();
  }

  const pluginRoot = getPluginRoot();
  const resolvedRoot = path.resolve(pluginRoot);
  const scriptPath = path.resolve(pluginRoot, relScriptPath);

  // Prevent path traversal outside the plugin root
  if (!scriptPath.startsWith(resolvedRoot + path.sep)) {
    process.stderr.write(`[Hook] Path traversal rejected for ${hookId}: ${scriptPath}\n`);
    allow();
  }

  if (!fs.existsSync(scriptPath)) {
    process.stderr.write(`[Hook] Script not found for ${hookId}: ${scriptPath}\n`);
    allow();
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
    try {
      const output = hookModule.run(raw);
      finalizeRunResult(output);
    } catch (runErr) {
      process.stderr.write(`[Hook] run() error for ${hookId}: ${runErr.message}\n`);
      allow();
    }
    return;
  }

  // Legacy path: spawn a child Node process for hooks without run() export
  const result = spawnSync('node', [scriptPath], {
    input: raw,
    encoding: 'utf8',
    env: process.env,
    cwd: process.cwd(),
    timeout: 30000
  });

  if (result.stderr) process.stderr.write(result.stderr);
  // Forward only genuine stdout (a real decision object). Suppress the echoed
  // input event, which would otherwise be misparsed as an invalid decision.
  if (result.stdout && !isPassthroughEcho(result.stdout, raw)) {
    process.stdout.write(result.stdout);
  }

  process.exit(Number.isInteger(result.status) ? result.status : 0);
}

main().catch(err => {
  process.stderr.write(`[Hook] run-with-flags error: ${err.message}\n`);
  process.exit(0);
});
