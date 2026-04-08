#!/usr/bin/env node
/**
 * Telemetry Capability — Stop handler
 *
 * Fires on: Stop (Claude, Cursor, Codex)
 * Purpose: Compute token delta from hook payload, append to ~/.aw/telemetry/costs.jsonl.
 *          Extract agents, skills, and MCP tools from transcript.
 *
 * Network: No
 * Target latency: <100ms
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
} = require('./telemetry-lib');

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
  if (sessionMeta && input.compaction) {
    sessionMeta.compaction_count = (sessionMeta.compaction_count || 0) + 1;
    writeSessionMetadata(sessionId, sessionMeta);
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
