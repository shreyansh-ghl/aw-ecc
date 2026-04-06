#!/usr/bin/env node
'use strict';

/**
 * Hook: session-end-feedback
 * Fires at session end to send memory feedback for memories that were injected
 * during the session via <team-memory> tags.
 *
 * Reads the session transcript/stdin, checks if memories were injected this
 * session (by looking for <team-memory> tags), extracts memory IDs from the
 * temp file written by session-start.js, and calls memory_feedback MCP tool
 * for each memory ID.
 *
 * Non-blocking, fire-and-forget, best-effort.
 * Cross-platform (Windows, macOS, Linux).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { resolveMcpUrl } = require('../lib/mcp-url');

const MCP_BASE_URL = resolveMcpUrl();
const AW_HOME = path.join(os.homedir(), '.aw');
const REGISTRY_DIR = '.aw_registry';
const MEMORY_IDS_DIR = path.join(os.tmpdir(), 'aw-memory-feedback');
const MAX_STDIN = 1024 * 1024;

let stdinData = '';

if (require.main === module) {
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', chunk => {
    if (stdinData.length < MAX_STDIN) {
      const remaining = MAX_STDIN - stdinData.length;
      stdinData += chunk.substring(0, remaining);
    }
  });

  process.stdin.on('end', () => {
    main().catch(err => {
      console.error(`[memory-feedback] Fatal: ${err.message}`);
      process.exit(0); // Don't block session end
    });
  });
}

/**
 * Resolve namespace from .sync-config.json.
 */
function resolveNamespace() {
  try {
    const configPath = path.join(AW_HOME, REGISTRY_DIR, '.sync-config.json');
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.namespace || null;
  } catch {
    return null;
  }
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
 * Build MCP request headers with namespace and auth.
 */
function buildMcpHeaders(namespace) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
  if (namespace) headers['X-Namespace'] = namespace;
  const token = resolveGhToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Send a single memory_feedback MCP call. Fire-and-forget.
 */
async function sendFeedback(memoryId, feedbackType, reason, headers) {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'memory_feedback',
      arguments: {
        memory_id: memoryId,
        feedback_type: feedbackType,
        reason,
        actor_type: 'agent',
      },
    },
  });

  const response = await fetch(MCP_BASE_URL, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  // Consume the response body (handles both JSON and SSE)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    const text = await response.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.error) throw new Error(event.error.message);
        } catch (e) {
          if (e.message && e.message.startsWith('MCP ')) throw e;
          /* skip JSON parse errors */
        }
      }
    }
  } else {
    const json = await response.json();
    if (json.error) throw new Error(json.error.message);
  }
}

/**
 * Load served memory IDs from the temp file written by session-start.js.
 * Returns { ids: string[], timestamp: number } or null.
 */
function loadServedMemoryIds() {
  try {
    const sessionId = process.env.CLAUDE_SESSION_ID || 'default';
    const filePath = path.join(MEMORY_IDS_DIR, `${sessionId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Clean up the temp file after reading
    try { fs.unlinkSync(filePath); } catch { /* best effort */ }
    return data;
  } catch {
    return null;
  }
}

/**
 * Check if the session transcript contains evidence of memory injection.
 * Looks for <team-memory> or <memory-context> tags that session-start.js injects.
 */
function sessionUsedMemory(content) {
  return /<team-memory[\s>]/.test(content) || /<memory-context[\s>]/.test(content);
}

/**
 * Detect if the session ended with an error.
 * Heuristic: check for error markers in the last portion of the transcript.
 */
function sessionHadError(content) {
  const tail = content.slice(-2000);
  const errorMarkers = /\b(fatal error|unhandled exception|ENOENT|ENOMEM|segmentation fault|panic:|stack trace)\b/i;
  return errorMarkers.test(tail);
}

async function main() {
  // Combine env and stdin sources for transcript content
  const sessionSummary = process.env.SESSION_SUMMARY || '';
  let transcriptContent = sessionSummary || stdinData;

  if (!transcriptContent) {
    // Try reading transcript from stdin JSON envelope
    try {
      const input = JSON.parse(stdinData);
      if (input.transcript_path && fs.existsSync(input.transcript_path)) {
        transcriptContent = fs.readFileSync(input.transcript_path, 'utf8');
      }
    } catch { /* not JSON or no transcript */ }
  }

  // Check if memories were injected this session
  const memoryWasUsed = transcriptContent && sessionUsedMemory(transcriptContent);

  // Load served memory IDs from session-start temp file
  const servedData = loadServedMemoryIds();

  if (!servedData || !servedData.ids || servedData.ids.length === 0) {
    // No memory IDs tracked — nothing to send feedback for
    if (memoryWasUsed) {
      console.error('[memory-feedback] Memory tags found but no served IDs file — skipping');
    }
    // Pass through stdin
    process.stdout.write(stdinData);
    return;
  }

  if (!memoryWasUsed) {
    console.error('[memory-feedback] Served IDs found but no memory tags in transcript — skipping');
    process.stdout.write(stdinData);
    return;
  }

  // Determine feedback type based on session outcome
  const hadError = transcriptContent ? sessionHadError(transcriptContent) : false;
  const feedbackType = hadError ? 'agent_failure' : 'agent_success';
  const reason = hadError
    ? 'Memory used in session — session ended with errors'
    : 'Memory used in session — task completed successfully';

  console.error(`[memory-feedback] Sending ${feedbackType} feedback for ${servedData.ids.length} memory ID(s)`);

  // Build MCP headers
  const namespace = resolveNamespace();
  const headers = buildMcpHeaders(namespace);

  // Send feedback for each served memory ID (best-effort)
  for (const memoryId of servedData.ids) {
    try {
      await sendFeedback(memoryId, feedbackType, reason, headers);
      console.error(`[memory-feedback] Sent ${feedbackType} for ${memoryId}`);
    } catch (err) {
      console.error(`[memory-feedback] Failed for ${memoryId}: ${err.message}`);
    }
  }

  // Pass through stdin unchanged
  process.stdout.write(stdinData);
}

// Exported for testing
if (typeof module !== 'undefined' && module.exports && require.main !== module) {
  module.exports = {
    sessionUsedMemory,
    sessionHadError,
    loadServedMemoryIds,
    resolveNamespace,
  };
}
