#!/usr/bin/env node
/**
 * Hook: session-end-extract
 * Fires at end of Claude Code session to extract learnings and store as memories.
 *
 * Reads session transcript, identifies key learnings/decisions/patterns,
 * stores them via memory_curated_store MCP tool.
 * Feedback for served memories is handled by session-end-feedback.js (P0-1).
 *
 * Cross-platform (Windows, macOS, Linux)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { resolveMcpUrl } = require('../lib/mcp-url');
const { isDuplicate, recordExtraction, cleanupDedup, enqueueForExtraction, flushQueue } = require('../lib/dedup');
const MCP_BASE_URL = resolveMcpUrl();
const AW_HOME = path.join(os.homedir(), '.aw');
const REGISTRY_DIR = '.aw_registry';
const MIN_SESSION_MINUTES = 5;
const MAX_STDIN = 1024 * 1024;
const MAX_TRANSCRIPT_BYTES = 2 * 1024 * 1024; // Read last 2MB of transcript

/**
 * Extract human-readable text from a Claude Code JSONL transcript.
 * Pulls assistant message text and user messages, skipping tool calls
 * and binary/JSON noise.
 */
function extractTextFromTranscript(transcriptPath) {
  try {
    const stat = fs.statSync(transcriptPath);
    // Read last portion of file to stay within budget
    const fd = fs.openSync(transcriptPath, 'r');
    const start = Math.max(0, stat.size - MAX_TRANSCRIPT_BYTES);
    const buf = Buffer.alloc(Math.min(stat.size, MAX_TRANSCRIPT_BYTES));
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);

    const raw = buf.toString('utf8');
    const lines = raw.split('\n').filter(Boolean);
    const textParts = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        // Extract assistant text content
        const msg = entry.message || entry;
        if (msg.role === 'assistant' && Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'text' && block.text) {
              textParts.push(block.text);
            }
          }
        }
        // Extract user messages
        if (msg.role === 'user' && typeof msg.content === 'string') {
          textParts.push(msg.content);
        }
        if (msg.role === 'user' && Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'text' && block.text) {
              textParts.push(block.text);
            }
          }
        }
      } catch { /* skip unparseable lines */ }
    }

    return textParts.join('\n');
  } catch (err) {
    console.log(`[memory-extract] Failed to parse transcript: ${err.message}`);
    // Fall back to raw content
    return fs.readFileSync(transcriptPath, 'utf8');
  }
}

/**
 * Strip known noise patterns from transcript text before sending to extraction.
 * Removes JSON objects, tool output, progress events, and binary noise.
 * Phase 1 (v3): Client-side pre-filter to reduce noise reaching the LLM.
 */
function stripTranscriptNoise(text) {
  return text
    // Remove JSON object lines (tool results, progress events)
    .replace(/^\s*\{["\s]*(?:parentUuid|isSidechain|jsonrpc|type.*progress|result.*content).*$/gm, '')
    // Remove base64/binary data
    .replace(/[A-Za-z0-9+/]{100,}={0,2}/g, '[binary-data]')
    // Remove embedding arrays
    .replace(/\[(?:-?\d+\.?\d*,?\s*){20,}\]/g, '[embedding-vector]')
    // Remove raw code blocks that are just file contents (not discussions about code)
    .replace(/^(?:     \d+→).+$/gm, '') // Line-numbered file output from Read tool
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n');
}

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
      console.error(`[memory-extract] Fatal: ${err.message}`);
      process.exit(0); // Don't block session end
    });
  });
}

/**
 * Resolve config from .sync-config.json.
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
 * E.g. ['commerce/payments'] → ['commerce/payments', 'commerce', 'platform']
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
 * Build MCP request headers with namespace-scoped paths and auth.
 */
function buildMcpHeaders(cfg) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };

  // Namespace-scoped: send ancestry paths from include[]
  const includes = cfg?.include || [];
  const paths = [...includes];
  if (!paths.some(p => p === 'platform' || p.startsWith('platform/'))) {
    paths.push('platform');
  }
  if (paths.length > 0) {
    headers['X-Resolved-Paths'] = paths.join(',');
  }

  // GitHub user for individual-layer portability
  if (cfg?.user) headers['X-Github-User'] = cfg.user;

  // Backwards compat: keep X-Namespace
  if (cfg?.namespace) headers['X-Namespace'] = cfg.namespace;

  const token = resolveGhToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Call an MCP tool via JSON-RPC 2.0.
 */
async function callMcpTool(toolName, params, headers, timeoutMs = 10000) {
  const response = await fetch(MCP_BASE_URL, {
    method: 'POST',
    headers: headers || { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: params },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`MCP ${toolName}: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    const text = await response.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.result) return extractToolResult(event.result);
          if (event.error) throw new Error(`MCP ${toolName}: ${event.error.message}`);
        } catch (e) {
          if (e.message.startsWith('MCP ')) throw e;
        }
      }
    }
    throw new Error(`MCP ${toolName}: no result in SSE stream`);
  }

  const json = await response.json();
  if (json.error) throw new Error(`MCP ${toolName}: ${json.error.message}`);
  return extractToolResult(json.result);
}

/**
 * Extract content from MCP tools/call result envelope.
 */
function extractToolResult(result) {
  if (!result) return {};
  const content = result.content;
  if (Array.isArray(content) && content.length > 0 && content[0].text) {
    try { return JSON.parse(content[0].text); } catch { return { text: content[0].text }; }
  }
  return result;
}

async function main() {
  // Try to get transcript content from multiple sources:
  // 1. stdin JSON with transcript_path (from Stop hook or SessionEnd)
  // 2. SESSION_SUMMARY env var (manual/test invocation)
  let transcriptContent = '';
  let transcriptPath = '';

  try {
    const input = JSON.parse(stdinData);
    if (input.transcript_path && fs.existsSync(input.transcript_path)) {
      transcriptPath = input.transcript_path;
      transcriptContent = extractTextFromTranscript(input.transcript_path);
    }
  } catch {
    // Not JSON or no transcript_path
  }

  if (!transcriptContent) {
    transcriptContent = process.env.SESSION_SUMMARY || '';
  }

  if (!transcriptContent) {
    console.log('[memory-extract] No session summary or transcript, skipping');
    return;
  }

  // Estimate session duration from transcript file age
  let sessionDuration = parseInt(process.env.SESSION_DURATION_MINUTES || '0', 10);
  if (sessionDuration === 0 && transcriptPath) {
    try {
      const stat = fs.statSync(transcriptPath);
      sessionDuration = Math.floor((Date.now() - stat.birthtimeMs) / 60000);
    } catch { /* best effort */ }
  }

  // Resolve config and build namespace-scoped headers for MCP calls
  const cfg = resolveConfig();
  const headers = buildMcpHeaders(cfg);

  // Only extract from sessions > 5 minutes (PRD resolved decision)
  if (sessionDuration > 0 && sessionDuration < MIN_SESSION_MINUTES) {
    console.log(`[memory-extract] Session too short (${sessionDuration}min < ${MIN_SESSION_MINUTES}min), skipping extraction`);
    return;
  }

  // --- Phase 2+3: Extract via server-side LLM with dedup + offline fallback ---
  if (transcriptContent.length < 1000) {
    console.log('[memory-extract] Transcript too short for extraction (< 1000 chars)');
    return;
  }

  // Phase 1 (v3): Strip noise before extraction
  const cleanedContent = stripTranscriptNoise(transcriptContent);

  // Truncate to 100K chars (tail — recent context is higher signal)
  const extractContent = cleanedContent.length > 100000
    ? cleanedContent.slice(-100000)
    : cleanedContent;

  // Phase 3: SHA-256 dedup — skip if content unchanged since last extraction
  const sessionId = process.env.CLAUDE_SESSION_ID || 'default';
  if (isDuplicate(sessionId, extractContent)) {
    console.log('[memory-extract] Content unchanged since last extraction (dedup hit), skipping');
    return;
  }

  // Build session metadata for better extraction quality
  const sessionMetadata = {};
  if (sessionDuration > 0) sessionMetadata.duration_minutes = sessionDuration;
  if (transcriptPath) {
    sessionMetadata.cwd = path.dirname(transcriptPath);
  }

  // Phase 3: Flush any queued offline items first
  try {
    const queueResult = await flushQueue((toolName, params) =>
      callMcpTool(toolName, params, headers, 30000)
    );
    if (queueResult.processed > 0) {
      console.log(`[memory-extract] Flushed offline queue: ${queueResult.processed} processed, ${queueResult.discarded} discarded`);
    }
  } catch (err) {
    console.error(`[memory-extract] Queue flush failed: ${err.message}`);
  }

  console.log(`[memory-extract] Calling memory_batch_extract (${extractContent.length} chars)...`);

  try {
    const result = await callMcpTool('memory_batch_extract', {
      content: extractContent,
      source: 'session-end',
      session_metadata: sessionMetadata,
    }, headers, 30000); // 30s timeout — batch extraction + curation takes time

    const extracted = result?.extracted ?? 0;
    const created = result?.created ?? 0;
    const updated = result?.updated ?? 0;
    const skipped = result?.skipped ?? 0;
    console.log(`[memory-extract] Batch extract: ${extracted} extracted, ${created} created, ${updated} updated, ${skipped} skipped`);

    // Record successful extraction for dedup
    recordExtraction(sessionId, extractContent);
  } catch (err) {
    console.error(`[memory-extract] Batch extraction failed, queuing offline: ${err.message}`);
    // Phase 3: Queue for later if MCP unreachable
    enqueueForExtraction(extractContent, 'session-end', sessionMetadata);
  }

  // Cleanup dedup file at session end (session is over, no more extractions)
  cleanupDedup(sessionId);
}

// extractCandidates() regex removed in Phase 2 — server-side LLM extraction via memory_batch_extract

// Exported for testing
if (typeof module !== 'undefined' && module.exports && require.main !== module) {
  module.exports = {
    stripTranscriptNoise,
    extractTextFromTranscript,
    computeAncestry,
  };
}
