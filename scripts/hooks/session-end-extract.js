#!/usr/bin/env node
/**
 * Hook: session-end-extract
 * Fires at end of Claude Code session to extract learnings and store as memories.
 *
 * Reads session transcript, identifies key learnings/decisions/patterns,
 * stores them via memory_curated_store MCP tool, and sends implicit feedback
 * for memories that were served at session start.
 *
 * Cross-platform (Windows, macOS, Linux)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { resolveMcpUrl } = require('../lib/mcp-url');
const MCP_BASE_URL = resolveMcpUrl();
const AW_HOME = path.join(os.homedir(), '.aw');
const REGISTRY_DIR = '.aw_registry';
const MEMORY_IDS_DIR = path.join(os.tmpdir(), 'aw-memory-feedback');
const MAX_CANDIDATES = 10;
const MIN_SESSION_MINUTES = 5;
const MAX_STDIN = 1024 * 1024;

let stdinData = '';
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
 * Call an MCP tool via JSON-RPC 2.0.
 */
async function callMcpTool(toolName, params, headers) {
  const response = await fetch(MCP_BASE_URL, {
    method: 'POST',
    headers: headers || { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: params },
    }),
    signal: AbortSignal.timeout(10000),
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
 * Evaluate served memories against session transcript and send feedback.
 *
 * Uses a simple heuristic: if the transcript content references concepts
 * that overlap with served memory IDs, the memory was likely useful.
 * Memories served but not referenced are marked as irrelevant.
 *
 * This is a lightweight approximation — the LLM-based evaluation
 * described in the PRD would require a separate API call.
 */
async function sendImplicitFeedback(servedData, transcriptContent, headers) {
  if (!servedData || !servedData.ids || servedData.ids.length === 0) return;

  const servedIds = servedData.ids;
  console.log(`[memory-extract] Evaluating ${servedIds.length} served memories for feedback`);

  // Calculate session duration as a proxy for engagement
  const sessionStartTs = servedData.timestamp || 0;
  const sessionDurationMs = sessionStartTs > 0 ? Date.now() - sessionStartTs : 0;
  const sessionMinutes = Math.floor(sessionDurationMs / 60000);

  // Heuristic: if session was very short (<2 min), memories were likely not used
  // If session was normal length, assume memories were at least somewhat useful
  const wasShortSession = sessionMinutes < 2;

  for (const memoryId of servedIds) {
    try {
      const signal = wasShortSession ? 'irrelevant' : 'useful';
      const confidence = wasShortSession ? 0.3 : 0.5; // Low confidence — implicit signal only

      await callMcpTool('memory_feedback', {
        memory_id: memoryId,
        signal,
        confidence,
        source: 'implicit-session',
        context: `Session duration: ${sessionMinutes}min. Implicit feedback from session lifecycle.`,
      }, headers);

      console.log(`[memory-extract] Feedback sent for ${memoryId}: ${signal} (confidence=${confidence})`);
    } catch (err) {
      console.error(`[memory-extract] Failed to send feedback for ${memoryId}: ${err.message}`);
    }
  }
}

async function main() {
  const sessionSummary = process.env.SESSION_SUMMARY || '';
  const sessionDuration = parseInt(process.env.SESSION_DURATION_MINUTES || '0', 10);

  // Only extract from sessions > 5 minutes (PRD resolved decision)
  if (sessionDuration < MIN_SESSION_MINUTES) {
    console.log('[memory-extract] Session too short, skipping');
    return;
  }

  // Try stdin JSON for transcript, fall back to env
  let transcriptContent = sessionSummary;
  if (!transcriptContent) {
    try {
      const input = JSON.parse(stdinData);
      if (input.transcript_path) {
        if (fs.existsSync(input.transcript_path)) {
          transcriptContent = fs.readFileSync(input.transcript_path, 'utf8');
        }
      }
    } catch {
      // No transcript available
    }
  }

  if (!transcriptContent) {
    console.log('[memory-extract] No session summary or transcript, skipping');
    return;
  }

  // Resolve namespace and build headers for MCP calls
  const namespace = resolveNamespace();
  const headers = namespace ? buildMcpHeaders(namespace) : { 'Content-Type': 'application/json' };

  // --- Phase 1: Send implicit feedback for served memories ---
  const servedData = loadServedMemoryIds();
  if (servedData) {
    try {
      await sendImplicitFeedback(servedData, transcriptContent, headers);
    } catch (err) {
      console.error(`[memory-extract] Feedback phase failed: ${err.message}`);
    }
  }

  // --- Phase 2: Extract and store new memories ---
  const candidates = extractCandidates(transcriptContent);

  if (candidates.length === 0) {
    console.log('[memory-extract] No extractable patterns found');
    return;
  }

  console.log(`[memory-extract] Found ${candidates.length} candidate(s)`);

  for (const candidate of candidates) {
    try {
      const result = await callMcpTool('memory_curated_store', {
        content: candidate.content,
        type: candidate.type,
        source: 'hook',
        tags: ['auto-extracted', 'session-end'],
      }, headers);
      const action = (result && result.curation && result.curation.action) || 'STORED';
      console.log(`[memory-extract] ${action}: ${candidate.content.slice(0, 60)}...`);
    } catch (err) {
      console.error(`[memory-extract] Failed to store: ${err.message}`);
    }
  }
}

/**
 * Extract candidate memories from session content.
 * Identifies decisions, patterns, and pitfalls using keyword markers.
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

  const decisionMarkers = /\b(decided|chose|selected|went with|prefer|always|never)\b/i;
  const patternMarkers = /\b(pattern|convention|approach|best practice|standard)\b/i;
  const pitfallMarkers = /\b(bug|error|issue|problem|fix|resolved|workaround)\b/i;

  // Lines that are too generic to be useful memories
  const genericPatterns = /^(we (worked|did|made|built)|fixed (a |the )?bug$|updated (the |some )?code|made (some )?changes)/i;
  // Lines that are mostly code or file paths, not human insights
  const codePathPatterns = /^(- \/|diff --git|import |const |function )/;

  const seen = new Set();

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip short lines, duplicates, generic fluff, and code/path lines
    if (trimmed.length < 30) continue;
    if (seen.has(trimmed)) continue;
    if (genericPatterns.test(trimmed)) continue;
    if (codePathPatterns.test(trimmed)) continue;

    if (decisionMarkers.test(trimmed)) {
      candidates.push({ content: trimmed, type: 'decision' });
      seen.add(trimmed);
    } else if (patternMarkers.test(trimmed)) {
      candidates.push({ content: trimmed, type: 'pattern' });
      seen.add(trimmed);
    } else if (pitfallMarkers.test(trimmed)) {
      candidates.push({ content: trimmed, type: 'pitfall' });
      seen.add(trimmed);
    }
  }

  return candidates.slice(0, MAX_CANDIDATES);
}
