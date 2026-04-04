#!/usr/bin/env node
/**
 * Hook: session-end-extract
 * Fires at end of Claude Code session to extract learnings and store as memories.
 *
 * Reads session transcript, identifies key learnings/decisions/patterns,
 * and stores them via memory_curated_store MCP tool.
 *
 * Cross-platform (Windows, macOS, Linux)
 */

const MCP_URL = process.env.AW_MCP_URL || 'http://localhost:3100/agentic-workspace/mcp';
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
        const fs = require('fs');
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

  // Extract candidate memories from session content
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
      });
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
 */
function extractCandidates(content) {
  const candidates = [];
  const lines = content.split('\n').filter(l => l.trim());

  const decisionMarkers = /\b(decided|chose|selected|went with|prefer|always|never)\b/i;
  const patternMarkers = /\b(pattern|convention|approach|best practice|standard)\b/i;
  const pitfallMarkers = /\b(bug|error|issue|problem|fix|resolved|workaround)\b/i;
  const seen = new Set();

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip short lines and duplicates
    if (trimmed.length < 20) continue;
    if (seen.has(trimmed)) continue;

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

/**
 * Call an MCP tool via HTTP.
 */
async function callMcpTool(toolName, params) {
  const response = await fetch(`${MCP_URL}/tools/${toolName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`MCP ${toolName}: ${response.status}`);
  }
  return response.json();
}
