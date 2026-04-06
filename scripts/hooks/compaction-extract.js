#!/usr/bin/env node
/**
 * Hook: compaction-extract
 * Fires when Claude Code compacts context (Notification event).
 *
 * Reads the compaction summary from stdin, extracts key learnings
 * (decisions, patterns, errors), and stores them via memory_curated_store
 * MCP tool.
 *
 * Designed to be lightweight — this fires frequently during long sessions.
 *
 * Cross-platform (Windows, macOS, Linux)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const { resolveMcpUrl } = require('../lib/mcp-url');
const MCP_BASE_URL = resolveMcpUrl();
const AW_HOME = path.join(os.homedir(), '.aw');
const REGISTRY_DIR = '.aw_registry';
const MAX_STDIN = 512 * 1024; // 512KB — compaction summaries are smaller

/**
 * Resolve full config from .sync-config.json.
 */
function resolveConfig() {
  try {
    const configPath = path.join(AW_HOME, REGISTRY_DIR, '.sync-config.json');
    if (!fs.existsSync(configPath)) return null;
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Compute full ancestry chain for namespace paths.
 */
function computeAncestry(paths) {
  const result = new Set();
  for (const p of paths) {
    const segments = p.split('/');
    for (let i = segments.length; i >= 1; i--) {
      result.add(segments.slice(0, i).join('/'));
    }
  }
  result.add('platform');
  return [...result];
}

/**
 * Resolve GitHub token for auth.
 */
function resolveGhToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const { execSync } = require('child_process');
    const token = execSync('gh auth token', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    }).trim();
    if (token && (token.startsWith('ghp_') || token.startsWith('gho_') || token.startsWith('github_pat_'))) {
      return token;
    }
  } catch { /* gh not available */ }
  return null;
}

/**
 * Build MCP request headers.
 */
function buildMcpHeaders(cfg) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };

  const includes = cfg?.include || [];
  if (includes.length > 0) {
    const ancestryPaths = computeAncestry(includes);
    headers['X-Resolved-Paths'] = ancestryPaths.join(',');
  }

  if (cfg?.user) headers['X-Github-User'] = cfg.user;
  if (cfg?.namespace) headers['X-Namespace'] = cfg.namespace;

  const token = resolveGhToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Call an MCP tool via JSON-RPC 2.0. Returns parsed result or null.
 */
async function callMcpTool(toolName, params, headers) {
  const response = await fetch(MCP_BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: params },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    const text = await response.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.result) return extractToolResult(event.result);
        } catch { /* skip */ }
      }
    }
    return null;
  }

  const json = await response.json();
  if (json.error) return null;
  return extractToolResult(json.result);
}

/**
 * Extract content from MCP tools/call result envelope.
 */
function extractToolResult(result) {
  if (!result) return null;
  const content = result.content;
  if (Array.isArray(content) && content.length > 0 && content[0].text) {
    try { return JSON.parse(content[0].text); } catch { return { text: content[0].text }; }
  }
  return result;
}

// extractCandidates() regex removed in Phase 2 — server-side LLM extraction via memory_batch_extract

/**
 * run() export for in-process execution via run-with-flags.js.
 * Fires memory extraction asynchronously and returns input unchanged.
 */
function run(rawInput) {
  // Fire async extraction without blocking
  extractAndStore(rawInput).catch(err => {
    console.error(`[compaction-extract] Error: ${err.message}`);
  });
  return rawInput || '';
}

async function extractAndStore(rawInput) {
  const cfg = resolveConfig();
  if (!cfg) {
    console.error('[compaction-extract] No config found, skipping');
    return;
  }

  // Parse compaction summary from stdin
  let summary = '';
  try {
    const input = JSON.parse(rawInput || '{}');
    summary = input.summary || input.content || input.compaction_summary || '';
  } catch {
    // Raw text input — use as-is
    summary = rawInput || '';
  }

  if (!summary || summary.length < 50) {
    console.error('[compaction-extract] Summary too short, skipping');
    return;
  }

  const headers = buildMcpHeaders(cfg);

  // Single MCP call: server-side LLM extraction + curation
  console.error(`[compaction-extract] Calling memory_batch_extract (${summary.length} chars)...`);

  try {
    const result = await callMcpTool('memory_batch_extract', {
      content: summary,
      source: 'compaction',
    }, headers);

    const extracted = result?.extracted ?? 0;
    const created = result?.created ?? 0;
    const updated = result?.updated ?? 0;
    const skipped = result?.skipped ?? 0;
    console.error(`[compaction-extract] Batch: ${extracted} extracted, ${created} created, ${updated} updated, ${skipped} skipped`);
  } catch (err) {
    console.error(`[compaction-extract] Batch extraction failed: ${err.message}`);
  }
}

// Legacy CLI execution (when run directly via spawnSync)
if (require.main === module) {
  let stdinData = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', chunk => {
    if (stdinData.length < MAX_STDIN) {
      const remaining = MAX_STDIN - stdinData.length;
      stdinData += chunk.substring(0, remaining);
    }
  });

  process.stdin.on('end', () => {
    // Output stdin unchanged (don't block compaction)
    process.stdout.write(stdinData);
    // Fire extraction in background
    extractAndStore(stdinData).catch(err => {
      console.error(`[compaction-extract] Fatal: ${err.message}`);
    }).finally(() => {
      process.exit(0);
    });
  });
}

module.exports = { run };
