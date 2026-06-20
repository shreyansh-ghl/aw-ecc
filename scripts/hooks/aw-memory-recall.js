#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync: defaultSpawnSync } = require('child_process');

const { getAwMemoryHookConfig } = require('./aw-memory-config');
const { memoryIntentRecall, memorySearch } = require('./aw-memory-client');
const { redactForMemory } = require('./aw-memory-redaction');

const DEFAULT_QUERY_CHARS = 1000;
const DEFAULT_ITEM_CHARS = 240;

function cleanLine(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function asPositiveInt(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.round(number), min), max);
}

function promptFromInput(input = {}) {
  return String(input.prompt || input.content || input.message || '');
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function safeGitValue(spawnSyncImpl, cwd, args) {
  if (!cwd) return '';
  try {
    const result = spawnSyncImpl('git', ['-C', cwd, 'rev-parse', ...args], {
      encoding: 'utf8',
      timeout: 100,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (result?.status === 0) return String(result.stdout || '').trim();
  } catch (_error) {
    return '';
  }
  return '';
}

function resolveRepoMetadata(input = {}, adapters = {}) {
  const spawnSyncImpl = adapters.spawnSync || defaultSpawnSync;
  const cwd = firstString(input.cwd, process.cwd());
  const workspaceRoot = Array.isArray(input.workspace_roots)
    ? firstString(...input.workspace_roots)
    : '';
  const gitRoot = safeGitValue(spawnSyncImpl, cwd, ['--show-toplevel']);
  const repoPath = firstString(gitRoot, workspaceRoot, cwd);
  const branchValue = safeGitValue(spawnSyncImpl, cwd, ['--abbrev-ref', 'HEAD']);
  const branch = branchValue && branchValue !== 'HEAD' ? branchValue : '';

  const metadata = {};
  if (cwd) metadata.cwd = cwd;
  if (repoPath) {
    metadata.repoPath = repoPath;
    metadata.repoName = path.basename(repoPath);
  }
  if (branch) metadata.branch = branch;
  return metadata;
}

function buildSearchQuery(prompt, metadata, maxChars = DEFAULT_QUERY_CHARS) {
  const redacted = redactForMemory(prompt, { maxChars });
  const parts = [cleanLine(redacted.value)];
  if (metadata.repoName) parts.push(`repo:${metadata.repoName}`);
  if (metadata.branch) parts.push(`branch:${metadata.branch}`);
  return parts.filter(Boolean).join('\n');
}

function parseJsonMaybe(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function parsedMemoryEntries(text) {
  const parsed = parseJsonMaybe(text);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.results)) return parsed.results;
  if (Array.isArray(parsed?.memories)) return parsed.memories;
  return null;
}

function contentArrayText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (typeof entry?.text === 'string') return entry.text;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function resultEntriesFromContent(content) {
  if (typeof content === 'string') {
    const parsedEntries = parsedMemoryEntries(content);
    if (parsedEntries) return parsedEntries;
    return [{ text: content }];
  }

  if (Array.isArray(content)) {
    const text = contentArrayText(content);
    const parsedEntries = parsedMemoryEntries(text);
    if (parsedEntries) return parsedEntries;
    return text ? [{ text }] : [];
  }

  return [];
}

function extractMemorySearchResults(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.results)) return result.results;
  if (Array.isArray(result.memories)) return result.memories;
  if (Object.prototype.hasOwnProperty.call(result, 'content')) {
    return resultEntriesFromContent(result.content);
  }
  return [];
}

function extractIntentRecallResult(result) {
  if (!result) return null;
  if (typeof result === 'string') return parseJsonMaybe(result);
  if (typeof result !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(result, 'should_inject')) return result;
  if (Object.prototype.hasOwnProperty.call(result, 'content')) {
    const text = Array.isArray(result.content) ? contentArrayText(result.content) : String(result.content || '');
    return parseJsonMaybe(text);
  }
  return null;
}

function entryText(entry) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return '';
  if (typeof entry.text === 'string') return entry.text;
  if (typeof entry.content === 'string') return entry.content;
  if (Array.isArray(entry.content)) return contentArrayText(entry.content);
  if (typeof entry.summary === 'string') return entry.summary;
  if (typeof entry.value === 'string') return entry.value;
  if (typeof entry.memory?.text === 'string') return entry.memory.text;
  if (typeof entry.memory?.content === 'string') return entry.memory.content;
  return '';
}

function formatAwMemoryRecall(results, options = {}) {
  const maxResults = asPositiveInt(options.maxResults, 3, 1, 10);
  const maxItemChars = asPositiveInt(options.maxItemChars, DEFAULT_ITEM_CHARS, 40, 1000);
  const lines = [];
  const seen = new Set();

  for (const entry of results || []) {
    const raw = entryText(entry);
    if (!raw) continue;
    const redacted = redactForMemory(raw, { maxChars: maxItemChars });
    const text = cleanLine(redacted.value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    lines.push(`- ${text}`);
    if (lines.length >= maxResults) break;
  }

  return lines.length ? `AW Memory Recall\n${lines.join('\n')}` : '';
}

async function buildAwMemoryRecallContext(input = {}, adapters = {}) {
  const prompt = promptFromInput(input);
  if (!prompt.trim()) return '';

  const metadata = resolveRepoMetadata(input, adapters);
  const config = adapters.config || getAwMemoryHookConfig(
    adapters.env || process.env,
    adapters.fs,
    adapters.homeDir,
    firstString(metadata.repoPath, input.cwd, process.cwd())
  );

  if (!config?.enabled || !config?.recallEnabled) return '';

  const query = buildSearchQuery(prompt, metadata, adapters.maxQueryChars || DEFAULT_QUERY_CHARS);
  if (!query) return '';

  if (config.intentEnabled !== false) {
    const intentRecall = adapters.memoryIntentRecall || memoryIntentRecall;
    const intentArgs = {
      prompt: redactForMemory(prompt, { maxChars: adapters.maxQueryChars || DEFAULT_QUERY_CHARS }).value,
      harness: firstString(input.harness, adapters.env?.AW_HARNESS, process.env.AW_HARNESS, 'unknown'),
      max_results: asPositiveInt(config.maxResults, 3, 1, 10),
    };
    if (metadata.repoName) intentArgs.repo_slug = metadata.repoName;
    if (metadata.branch) intentArgs.branch = metadata.branch;
    if (config.namespace) intentArgs.namespace = config.namespace;

    const intentResponse = await intentRecall(config, intentArgs, adapters.clientAdapters || {});
    if (intentResponse?.ok) {
      const intentResult = extractIntentRecallResult(intentResponse.result);
      const context = typeof intentResult?.additional_context === 'string'
        && intentResult.should_inject === true
        ? intentResult.additional_context
        : '';
      return context ? redactForMemory(context, { maxChars: 4000 }).value : '';
    }
    if (intentResponse?.status !== 'unknown_tool') return '';
  }

  const search = adapters.memorySearch || memorySearch;
  const searchArgs = {
    query,
    limit: asPositiveInt(config.maxResults, 3, 1, 10),
    metadata,
  };
  if (config.namespace) searchArgs.namespace = config.namespace;

  const response = await search(config, searchArgs, adapters.clientAdapters || {});

  if (!response?.ok) return '';

  return formatAwMemoryRecall(extractMemorySearchResults(response.result), {
    maxResults: config.maxResults,
    maxItemChars: adapters.maxItemChars || DEFAULT_ITEM_CHARS,
  });
}

function readStdin() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        raw = raw.slice(0, 1024 * 1024);
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
    const output = await buildAwMemoryRecallContext(input);
    if (output) process.stdout.write(`${output}\n`);
  } catch (_error) {
    process.exitCode = 0;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildAwMemoryRecallContext,
  extractIntentRecallResult,
  extractMemorySearchResults,
  formatAwMemoryRecall,
  resolveRepoMetadata,
};
