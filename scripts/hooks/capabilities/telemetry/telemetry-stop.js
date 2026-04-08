#!/usr/bin/env node
/**
 * Telemetry Capability — Stop handler
 *
 * Fires on: Stop (Claude, Cursor, Codex)
 * Purpose: Compute token delta from hook payload, append to ~/.aw/telemetry/costs.jsonl.
 *          Extract agents, skills, and MCP tools from transcript.
 *          Every N turns (or N minutes), self-flush aggregated data to the API.
 *
 * Network: Conditional (self-flush only, async fire-and-forget)
 * Target latency: <100ms (flush is non-blocking)
 */

'use strict';

const fs = require('fs');
const { log, stripAnsi } = require('../../../lib/utils');
const {
  ensureTelemetryDir,
  estimateCost,
  toNumber,
  appendCostEntry,
  readSessionMetadata,
  writeSessionMetadata,
  getSessionId,
  shouldSelfFlush,
  markFlushed,
  readUnflushedEntries,
  aggregateEntries,
  updateCheckpoint,
  pushToApi,
  enqueue,
  flushQueue,
  getNamespace,
  buildTelemetryHeaders,
  detectPlatform,
  detectPlatformVersion,
  getProjectHash,
} = require('./telemetry-lib');
const { getApiUrl } = require('../../../lib/telemetry-constants');

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
    runStop();
  } catch {
    // Never fail the hook
  }
  // Pass stdin through unchanged
  process.stdout.write(raw);
});

function runStop() {
  const input = raw.trim() ? JSON.parse(raw) : {};
  const usage = input.usage || input.token_usage || {};

  const inputTokens = toNumber(usage.input_tokens || usage.prompt_tokens || 0);
  const outputTokens = toNumber(usage.output_tokens || usage.completion_tokens || 0);
  const cacheReadTokens = toNumber(usage.cache_read_input_tokens || usage.cache_read_tokens || 0);
  const cacheCreationTokens = toNumber(usage.cache_creation_input_tokens || usage.cache_creation_tokens || 0);

  // Skip if no token data (empty response)
  if (inputTokens === 0 && outputTokens === 0) return;

  const model = String(
    input.model
    || input._cursor?.model
    || process.env.CLAUDE_MODEL
    || 'unknown'
  );

  const sessionId = getSessionId();

  ensureTelemetryDir();

  // Build cost entry
  const entry = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_tokens: cacheReadTokens,
    cache_creation_tokens: cacheCreationTokens,
    estimated_cost_usd: estimateCost(model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens),
  };

  // Extract attribution from transcript if available
  const transcriptPath = input.transcript_path || process.env.CLAUDE_TRANSCRIPT_PATH;
  if (transcriptPath) {
    const attribution = extractAttribution(transcriptPath);
    if (attribution.agents.length > 0) entry.agents_used = attribution.agents;
    if (attribution.skills.length > 0) entry.skills_applied = attribution.skills;
    if (attribution.mcpTools.length > 0) entry.mcp_tools_used = attribution.mcpTools;
  }

  appendCostEntry(entry);

  // Update session metadata with compaction count if this was a compaction
  const sessionMeta = readSessionMetadata(sessionId);
  if (sessionMeta) {
    if (input.compaction) {
      sessionMeta.compaction_count = (sessionMeta.compaction_count || 0) + 1;
    }

    // Self-flush: check if we should push aggregated data to the API
    if (shouldSelfFlush(sessionMeta)) {
      // Mark flushed immediately (before async work) to prevent double-flush
      markFlushed(sessionMeta);
      writeSessionMetadata(sessionId, sessionMeta);

      // Fire-and-forget async API push — never blocks the hook
      performSelfFlush(sessionId, sessionMeta).catch(() => {
        // Non-fatal — data stays in costs.jsonl for next flush
      });
    } else {
      writeSessionMetadata(sessionId, sessionMeta);
    }
  }
}

/**
 * Async self-flush — aggregate unflushed entries and push to API.
 * Also drains the offline queue if reachable.
 */
async function performSelfFlush(sessionId, sessionMeta) {
  const { entries, checkpointFrom, checkpointTo } = readUnflushedEntries();
  if (entries.length === 0) return;

  const namespace = getNamespace();
  const headers = buildTelemetryHeaders(namespace);
  const aggregated = aggregateEntries(entries);
  const apiUrl = getApiUrl();

  const payload = {
    shell_run_id: sessionId,
    session_id: sessionId,
    command: 'session',
    status: 'in_progress',
    branch: sessionMeta.branch || 'unknown',
    model: aggregated.model,
    platform: sessionMeta.platform || detectPlatform(),
    platform_version: sessionMeta.platform_version || detectPlatformVersion(),
    project_hash: sessionMeta.project_hash || getProjectHash(),
    tokens_used: aggregated.tokens_used,
    input_tokens: aggregated.input_tokens,
    output_tokens: aggregated.output_tokens,
    cache_read_tokens: aggregated.cache_read_tokens,
    cache_creation_tokens: aggregated.cache_creation_tokens,
    cost_usd: aggregated.cost_usd,
    agents_used: aggregated.agents_used,
    skills_applied: aggregated.skills_applied,
    mcp_tools_used: aggregated.mcp_tools_used,
    compaction_count: sessionMeta.compaction_count || 0,
    turn_count: sessionMeta.turn_count || 0,
    pr_url: aggregated.pr_url,
    pr_number: aggregated.pr_number,
    pr_repo: aggregated.pr_repo,
    checkpoint_from: checkpointFrom,
    checkpoint_to: checkpointTo,
    namespace: namespace || undefined,
  };

  const ok = await pushToApi(`${apiUrl}/usage-telemetry/ingest`, payload, headers);
  if (ok) {
    updateCheckpoint(sessionId, checkpointTo);
    // Also drain offline queue while we have connectivity
    await flushQueue(headers).catch(() => {});
  } else {
    enqueue(payload, '/usage-telemetry/ingest');
  }
}

/**
 * Extract agents, skills, and MCP tools from transcript.
 * Scans the JSONL transcript for tool_use entries and system messages.
 */
function extractAttribution(transcriptPath) {
  const agents = new Set();
  const skills = new Set();
  const mcpTools = new Set();

  try {
    if (!fs.existsSync(transcriptPath)) return { agents: [], skills: [], mcpTools: [] };

    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Extract from assistant message content blocks
        if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
          for (const block of entry.message.content) {
            if (block.type === 'tool_use') {
              const name = block.name || '';

              // MCP tools: pattern mcp__server__method
              if (name.startsWith('mcp__')) {
                const parts = name.split('__');
                if (parts.length >= 2) mcpTools.add(parts[1]); // server name
              }

              // Agent tool invocations
              if (name === 'Agent' && block.input?.subagent_type) {
                agents.add(block.input.subagent_type);
              }

              // Skill tool invocations
              if (name === 'Skill' && block.input?.skill_name) {
                skills.add(block.input.skill_name);
              }
            }
          }
        }

        // Extract from system messages that mention skill loading
        if (entry.type === 'system' || entry.role === 'system') {
          const text = typeof entry.content === 'string' ? entry.content
            : typeof entry.message?.content === 'string' ? entry.message.content
            : '';

          // Detect loaded skills from system reminders
          const skillMatch = text.match(/skills? (?:available|loaded|invoked).*?:\s*(.+)/i);
          if (skillMatch) {
            skillMatch[1].split(',').map(s => s.trim()).filter(Boolean).forEach(s => skills.add(s));
          }
        }
      } catch {
        // Skip unparseable lines
      }
    }
  } catch {
    // Transcript read failure — non-fatal
  }

  return {
    agents: Array.from(agents).slice(0, 20),
    skills: Array.from(skills).slice(0, 30),
    mcpTools: Array.from(mcpTools).slice(0, 30),
  };
}
