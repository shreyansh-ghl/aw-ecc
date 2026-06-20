#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { getAwMemoryHookConfig } = require('./aw-memory-config');
const { memoryIntentCapture } = require('./aw-memory-client');
const { redactForMemory } = require('./aw-memory-redaction');
const { resolveRepoMetadata } = require('./aw-memory-recall');

const STATE_RELATIVE_PATH = path.join('.aw_docs', 'cache', 'aw-memory-intent-state.json');
const MAX_STDIN = 1024 * 1024;

function parseJsonMaybe(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function contentText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (typeof entry?.text === 'string') return entry.text;
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

function messageLine(role, content) {
  const text = contentText(content).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const label = role === 'assistant' ? 'Assistant' : 'User';
  return `${label}: ${text}`;
}

function readClaudeJsonlTranscript(filePath, fsAdapter = fs) {
  if (!filePath || !fsAdapter.existsSync(filePath)) return '';
  const content = fsAdapter.readFileSync(filePath, 'utf8');
  const lines = [];

  for (const rawLine of content.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const entry = parseJsonMaybe(rawLine);
    if (!entry || typeof entry !== 'object') continue;
    const role = entry.message?.role || entry.role || entry.type;
    if (role !== 'user' && role !== 'assistant') continue;
    const line = messageLine(role, entry.message?.content ?? entry.content);
    if (line) lines.push(line);
  }

  return lines.join('\n');
}

function transcriptFromMessages(messages) {
  if (!Array.isArray(messages)) return '';
  return messages
    .map((message) => {
      if (!message || typeof message !== 'object') return '';
      const role = message.role === 'assistant' ? 'assistant' : 'user';
      return messageLine(role, message.content ?? message.text ?? message.message);
    })
    .filter(Boolean)
    .join('\n');
}

function extractTranscriptFromHookInput(input = {}, adapters = {}) {
  const fsAdapter = adapters.fs || fs;
  const direct = firstString(input.transcript, input.conversation);
  if (direct) return direct;

  const messages = transcriptFromMessages(input.messages);
  if (messages) return messages;

  const transcriptPath = firstString(input.transcript_path, adapters.env?.CLAUDE_TRANSCRIPT_PATH, process.env.CLAUDE_TRANSCRIPT_PATH);
  const transcript = readClaudeJsonlTranscript(transcriptPath, fsAdapter);
  if (transcript) return transcript;

  const prompt = firstString(input.prompt, input.content, input.message);
  return prompt ? `User: ${prompt}` : '';
}

function statePathFor(input = {}, metadata = {}) {
  const root = firstString(metadata.repoPath, input.cwd, process.cwd());
  return path.join(root, STATE_RELATIVE_PATH);
}

function readState(filePath, fsAdapter = fs) {
  try {
    if (!fsAdapter.existsSync(filePath)) return {};
    const parsed = parseJsonMaybe(fsAdapter.readFileSync(filePath, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeState(filePath, patch, fsAdapter = fs) {
  try {
    fsAdapter.mkdirSync(path.dirname(filePath), { recursive: true });
    const existing = readState(filePath, fsAdapter);
    fsAdapter.writeFileSync(filePath, JSON.stringify({
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    }, null, 2));
  } catch (_error) {
    // Stop hooks must remain fail-open.
  }
}

function buildMemoryIntentCaptureArgs(input = {}, config, metadata, transcript, env = process.env) {
  const redacted = redactForMemory(transcript, { maxChars: config.captureMaxChars || 12000 });
  const args = {
    transcript: redacted.value,
    harness: firstString(input.harness, env.AW_HARNESS, 'unknown'),
    max_chars: config.captureMaxChars || 12000,
    dry_run: Boolean(config.dryRun),
  };
  if (metadata.repoName) args.repo_slug = metadata.repoName;
  if (metadata.branch) args.branch = metadata.branch;
  if (input.session_id) args.session_id = String(input.session_id);
  if (config.namespace) args.namespace = config.namespace;
  return args;
}

async function captureAwMemoryIntent(input = {}, adapters = {}) {
  const env = adapters.env || process.env;
  const metadata = resolveRepoMetadata(input, adapters);
  const config = adapters.config || getAwMemoryHookConfig(
    env,
    adapters.fs,
    adapters.homeDir,
    firstString(metadata.repoPath, input.cwd, process.cwd())
  );
  const statePath = adapters.statePath || statePathFor(input, metadata);

  if (!config?.enabled || !config?.captureEnabled || config.intentEnabled === false) {
    writeState(statePath, { status: 'disabled' }, adapters.fs || fs);
    return { ok: true, skipped: true, status: 'disabled' };
  }

  const transcript = extractTranscriptFromHookInput(input, adapters);
  if (!transcript.trim()) {
    writeState(statePath, { status: 'skipped', reason: 'transcript_unavailable' }, adapters.fs || fs);
    return { ok: true, skipped: true, status: 'transcript_unavailable' };
  }

  const args = buildMemoryIntentCaptureArgs(input, config, metadata, transcript, env);
  const capture = adapters.memoryIntentCapture || memoryIntentCapture;
  const response = await capture(config, args, adapters.clientAdapters || {});
  const status = response?.ok ? 'captured' : (response?.status || 'failed');

  writeState(statePath, {
    status,
    namespace: config.namespace || null,
    repoName: metadata.repoName || null,
    branch: metadata.branch || null,
    result: response?.ok ? response.result : null,
    error: response?.ok ? null : response?.message || null,
  }, adapters.fs || fs);

  return {
    ok: Boolean(response?.ok),
    status,
    response,
    args,
  };
}

function readStdin() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      if (raw.length < MAX_STDIN) {
        raw += chunk.slice(0, MAX_STDIN - raw.length);
      }
    });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', () => resolve(raw));
  });
}

async function main() {
  try {
    const raw = await readStdin();
    const input = parseJsonMaybe(raw) || {};
    await captureAwMemoryIntent(input);
  } catch (_error) {
    process.exitCode = 0;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildMemoryIntentCaptureArgs,
  captureAwMemoryIntent,
  extractTranscriptFromHookInput,
  readClaudeJsonlTranscript,
};
