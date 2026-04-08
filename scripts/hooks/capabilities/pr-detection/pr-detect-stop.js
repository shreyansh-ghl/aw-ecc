#!/usr/bin/env node
/**
 * PR Detection Capability — Stop handler
 *
 * Fires on: Stop (Claude, Cursor, Codex)
 * Purpose: Scan transcript / tool output for `gh pr create` output or GitHub PR URLs.
 *          When found, store pr_url, pr_number, pr_repo in session metadata
 *          so it's included in the next telemetry flush.
 *
 * Network: No
 * Target latency: <50ms
 */

'use strict';

const fs = require('fs');
const { log } = require('../../../lib/utils');
const {
  readSessionMetadata,
  writeSessionMetadata,
  getSessionId,
} = require('../telemetry/telemetry-lib');

// Match GitHub PR URLs: https://github.com/owner/repo/pull/123
const PR_URL_REGEX = /https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/g;

const MAX_STDIN = 1024 * 1024;
let raw = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (raw.length < MAX_STDIN) {
    raw += chunk.substring(0, MAX_STDIN - raw.length);
  }
});

process.stdin.on('end', () => {
  try {
    runDetection();
  } catch {
    // Never fail the hook
  }
  // Pass stdin through unchanged
  process.stdout.write(raw);
});

function runDetection() {
  const input = raw.trim() ? JSON.parse(raw) : {};

  const transcriptPath = input.transcript_path || process.env.CLAUDE_TRANSCRIPT_PATH;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return;

  const prInfo = scanTranscriptForPRs(transcriptPath);
  if (!prInfo) return;

  // Store in session metadata for telemetry flush
  const sessionId = getSessionId();
  const sessionMeta = readSessionMetadata(sessionId);
  if (!sessionMeta) return;

  // Only update if we found new PR info (don't overwrite existing)
  if (!sessionMeta.pr_url || sessionMeta.pr_url !== prInfo.pr_url) {
    sessionMeta.pr_url = prInfo.pr_url;
    sessionMeta.pr_number = prInfo.pr_number;
    sessionMeta.pr_repo = prInfo.pr_repo;
    writeSessionMetadata(sessionId, sessionMeta);
    log(`[PR-Detect] Found PR: ${prInfo.pr_url}`);
  }
}

/**
 * Scan transcript JSONL for GitHub PR URLs.
 * Looks in tool_result content (from `gh pr create` Bash output)
 * and assistant message content.
 *
 * @returns {{ pr_url: string, pr_number: number, pr_repo: string } | null}
 */
function scanTranscriptForPRs(transcriptPath) {
  try {
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n').filter(Boolean);

    // Scan from the end — most recent PR is most relevant
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        const textToScan = extractTextContent(entry);
        if (!textToScan) continue;

        // Reset regex lastIndex for each scan
        PR_URL_REGEX.lastIndex = 0;
        const match = PR_URL_REGEX.exec(textToScan);
        if (match) {
          return {
            pr_url: match[0],
            pr_repo: match[1],
            pr_number: parseInt(match[2], 10),
          };
        }
      } catch {
        // Skip unparseable lines
      }
    }
  } catch {
    // Transcript read failure — non-fatal
  }

  return null;
}

/**
 * Extract scannable text content from a transcript entry.
 */
function extractTextContent(entry) {
  // Tool results (gh pr create output)
  if (entry.type === 'tool_result' || entry.tool_result) {
    const result = entry.tool_result || entry.content || entry.output || '';
    return typeof result === 'string' ? result
      : typeof result === 'object' ? JSON.stringify(result)
      : '';
  }

  // Assistant messages
  if (entry.type === 'assistant' && entry.message?.content) {
    const content = entry.message.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map(block => block.text || (block.type === 'tool_result' ? JSON.stringify(block) : ''))
        .join(' ');
    }
  }

  // Direct content field
  if (typeof entry.content === 'string') return entry.content;

  return null;
}
