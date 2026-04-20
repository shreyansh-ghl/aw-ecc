#!/usr/bin/env node
/**
 * Usage telemetry — UserPromptSubmit hook.
 *
 * Emits prompt_submitted as a boundary marker.
 * No matchers on any harness — always fires.
 *
 * Outputs {} on stdout.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildEvent, sendAsync, persistSessionSkill } = require('../lib/aw-usage-telemetry');

const MAX_STDIN = 1024 * 1024;

function resolvePromptText(input) {
  const candidates = [
    input?.prompt,
    input?.user_prompt,
    input?.message,
    input?.text,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }
  return '';
}

function extractAwSlashCommand(input) {
  const prompt = resolvePromptText(input).trim();
  const match = prompt.match(/^\/(aw:[a-z0-9-]+)(?:\s+([\s\S]*\S))?\s*$/i);
  if (!match) return null;
  return {
    skill_name: match[1].toLowerCase(),
    args: match[2] || '',
    source: 'user_prompt',
  };
}

function getSessionId(input) {
  return input?.session_id || input?.conversation_id || 'unknown';
}

function processPromptSubmitInput(input, deps = {}) {
  const emit = typeof deps.emit === 'function' ? deps.emit : () => {};
  const persistSkill = typeof deps.persistSkill === 'function' ? deps.persistSkill : () => {};
  const events = [];

  events.push({ eventType: 'prompt_submitted', payload: {} });

  const skill = extractAwSlashCommand(input);
  if (skill) {
    persistSkill(getSessionId(input), input?.turn_id || null, skill);
    events.push({
      eventType: 'skill_invoked',
      payload: {
        skill_name: skill.skill_name,
        args: skill.args,
      },
    });
  }

  for (const event of events) {
    emit(event.eventType, event.payload);
  }

  return events;
}

function main() {
  let raw = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (raw.length < MAX_STDIN) {
      raw += chunk.substring(0, MAX_STDIN - raw.length);
    }
  });

  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(raw);

      // Dedup: Cursor fires beforeSubmitPrompt twice per prompt (~100ms apart).
      // Use exclusive file create (wx) as an atomic lock — second process fails.
      const sessionId = getSessionId(input);
      const lockFile = path.join(os.tmpdir(), `aw-prompt-dedup-${sessionId}`);
      let skip = false;
      try {
        // Clean stale lock (>2s old)
        const stat = fs.statSync(lockFile);
        if (Date.now() - stat.mtimeMs > 2000) {
          fs.unlinkSync(lockFile);
        }
      } catch { /* no lock file */ }
      try {
        fs.writeFileSync(lockFile, String(Date.now()), { flag: 'wx' });
      } catch {
        // File already exists (created by parallel process) — skip
        skip = true;
      }

      if (!skip) {
        processPromptSubmitInput(input, {
          emit(eventType, payload) {
            sendAsync(buildEvent(input, eventType, payload));
          },
          persistSkill: persistSessionSkill,
        });
        // Clean up lock after brief delay so next prompt isn't blocked
        setTimeout(() => { try { fs.unlinkSync(lockFile); } catch {} }, 2000);
      }
    } catch {
      // Non-blocking.
    }

    process.stdout.write('{}');
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  extractAwSlashCommand,
  processPromptSubmitInput,
  resolvePromptText,
};
