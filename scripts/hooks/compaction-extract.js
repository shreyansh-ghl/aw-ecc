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
const MAX_CANDIDATES = 5; // Keep it small — fires frequently
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

/**
 * Extract candidate memories from compaction summary content.
 * Uses lightweight heuristics — looks for decisions, patterns, and errors.
 *
 * Quality filter: skips vague summaries and code/path lines to keep only
 * actionable, specific memories.
 *
 * GOOD: "NestJS services must use @platform-core/logger, never console.log"
 * GOOD: "Migration 035 added score_memories_3d() — use this for memory retrieval"
 * BAD:  "We worked on the memory system today"
 * BAD:  "Fixed a bug"
 */
function extractCandidates(content) {
  const candidates = [];
  const lines = content.split('\n').filter(l => l.trim());
  const seen = new Set();

  const decisionMarkers = /\b(decided|chose|selected|went with|prefer|always use|never use|switched to)\b/i;
  const patternMarkers = /\b(pattern|convention|approach|best practice|standard|workflow|architecture)\b/i;
  const errorMarkers = /\b(bug|error|issue|fix|resolved|workaround|root cause|regression)\b/i;

  // Lines that are too generic to be useful memories
  const genericPatterns = /^(we (worked|did|made|built)|fixed (a |the )?bug$|updated (the |some )?code|made (some )?changes)/i;
  // Lines that are mostly code or file paths, not human insights
  const codePathPatterns = /^(- \/|diff --git|import |const |function )/;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip short lines, code fences, duplicates, generic fluff, and code/path lines
    if (trimmed.length < 30) continue;
    if (trimmed.startsWith('```') || trimmed.startsWith('//') || trimmed.startsWith('#!')) continue;
    if (seen.has(trimmed)) continue;
    if (genericPatterns.test(trimmed)) continue;
    if (codePathPatterns.test(trimmed)) continue;

    let type = null;
    if (decisionMarkers.test(trimmed)) {
      type = 'decision';
    } else if (patternMarkers.test(trimmed)) {
      type = 'pattern';
    } else if (errorMarkers.test(trimmed)) {
      type = 'pitfall';
    }

    if (type) {
      candidates.push({ content: trimmed.slice(0, 300), type });
      seen.add(trimmed);
    }

    if (candidates.length >= MAX_CANDIDATES) break;
  }

  return candidates;
}

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

  const candidates = extractCandidates(summary);
  if (candidates.length === 0) {
    console.error('[compaction-extract] No extractable patterns in compaction summary');
    return;
  }

  console.error(`[compaction-extract] Found ${candidates.length} candidate(s)`);

  const headers = buildMcpHeaders(cfg);

  for (const candidate of candidates) {
    try {
      const result = await callMcpTool('memory_curated_store', {
        content: candidate.content,
        type: candidate.type,
        source: 'hook',
        tags: ['auto-extracted', 'compaction'],
      }, headers);
      const action = (result && result.curation && result.curation.action) || 'STORED';
      console.error(`[compaction-extract] ${action}: ${candidate.content.slice(0, 60)}...`);
    } catch (err) {
      console.error(`[compaction-extract] Failed to store: ${err.message}`);
    }
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
