#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { getAwMemoryHookConfig } = require('./aw-memory-config');
const { memoryStore } = require('./aw-memory-client');
const { redactForMemory } = require('./aw-memory-redaction');

const QUEUE_RELATIVE_PATH = path.join('.aw_docs', 'learnings', '_pending-sync.jsonl');
const STATE_RELATIVE_PATH = path.join('.aw_docs', 'cache', 'aw-memory-sync-state.json');

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function learningText(row) {
  return firstString(row?.text, row?.content, row?.learning, row?.summary, row?.message);
}

function stableLearningKey(row) {
  const explicit = firstString(row?.id, row?.key, row?.learningId);
  if (explicit) return explicit;
  const content = learningText(row) || canonicalJson(row || {});
  return `sha256:${sha256(content)}`;
}

function loadPendingLearningRows(queuePath, fsAdapter = fs) {
  const result = {
    rows: [],
    invalidRows: 0,
    queuePath,
  };

  if (!queuePath || !fsAdapter.existsSync(queuePath)) return result;

  const content = fsAdapter.readFileSync(queuePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    try {
      const row = JSON.parse(line);
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        result.rows.push({ ...row, _line: index + 1 });
      } else {
        result.invalidRows += 1;
      }
    } catch (_error) {
      result.invalidRows += 1;
    }
  }

  return result;
}

function readJson(filePath, fsAdapter = fs, fallback = {}) {
  try {
    if (!fsAdapter.existsSync(filePath)) return fallback;
    return JSON.parse(fsAdapter.readFileSync(filePath, 'utf8'));
  } catch (_error) {
    return fallback;
  }
}

function writeJson(filePath, value, fsAdapter = fs) {
  fsAdapter.mkdirSync(path.dirname(filePath), { recursive: true });
  fsAdapter.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function findAwDocsRoot(cwd, fsAdapter = fs) {
  let current = path.resolve(cwd || process.cwd());
  while (current && current !== path.dirname(current)) {
    if (fsAdapter.existsSync(path.join(current, QUEUE_RELATIVE_PATH))) return current;
    if (fsAdapter.existsSync(path.join(current, '.aw_docs'))) return current;
    current = path.dirname(current);
  }
  return path.resolve(cwd || process.cwd());
}

function resolveWorkspaceRoot(input = {}, fsAdapter = fs) {
  const cwd = firstString(input.cwd, process.cwd());
  const workspaceRoot = Array.isArray(input.workspace_roots)
    ? firstString(...input.workspace_roots)
    : '';
  return findAwDocsRoot(firstString(workspaceRoot, cwd), fsAdapter);
}

function buildMetadata(row, metadata = {}) {
  const rowMetadata = row && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? row.metadata
    : {};
  return {
    source: 'aw-learnings',
    kind: 'curated-learning',
    ...rowMetadata,
    ...metadata,
    line: row?._line || null,
  };
}

function buildMemoryStorePayload(row, metadata = {}) {
  const key = stableLearningKey(row);
  const redacted = redactForMemory(learningText(row), { maxChars: 4000 });
  return {
    key,
    text: redacted.value,
    metadata: buildMetadata(row, { ...metadata, key }),
  };
}

function loadReceiptState(statePath, fsAdapter = fs) {
  const state = readJson(statePath, fsAdapter, { receipts: {} });
  if (!state || typeof state !== 'object' || Array.isArray(state)) return { receipts: {} };
  if (!state.receipts || typeof state.receipts !== 'object' || Array.isArray(state.receipts)) {
    state.receipts = {};
  }
  return state;
}

function baseMetadata(workspaceRoot, input = {}) {
  const cwd = firstString(input.cwd, workspaceRoot);
  return {
    cwd,
    repoPath: workspaceRoot,
    repoName: path.basename(workspaceRoot),
  };
}

async function syncAwLearningsToMemory(input = {}, adapters = {}) {
  const fsAdapter = adapters.fs || fs;
  const config = adapters.config || getAwMemoryHookConfig(
    adapters.env || process.env,
    fsAdapter,
    adapters.homeDir
  );

  if (!config?.enabled || !config?.syncEnabled) {
    return { ok: true, status: 'disabled', planned: 0, stored: 0 };
  }

  const workspaceRoot = adapters.workspaceRoot || resolveWorkspaceRoot(input, fsAdapter);
  const queuePath = adapters.queuePath || path.join(workspaceRoot, QUEUE_RELATIVE_PATH);
  const statePath = adapters.statePath || path.join(workspaceRoot, STATE_RELATIVE_PATH);
  const loaded = loadPendingLearningRows(queuePath, fsAdapter);
  const state = loadReceiptState(statePath, fsAdapter);
  const seen = new Set();
  const store = adapters.memoryStore || memoryStore;
  const metadata = baseMetadata(workspaceRoot, input);
  const maxPerRun = Math.max(1, Number(config.syncMaxPerRun || 5));

  const summary = {
    ok: true,
    status: config.dryRun ? 'dry_run' : 'synced',
    queuePath,
    statePath,
    considered: loaded.rows.length,
    invalidRows: loaded.invalidRows,
    planned: 0,
    stored: 0,
    duplicates: 0,
    alreadySynced: 0,
    skippedEmpty: 0,
    failed: 0,
  };

  for (const row of loaded.rows) {
    const key = stableLearningKey(row);
    if (seen.has(key)) {
      summary.duplicates += 1;
      continue;
    }
    seen.add(key);

    if (state.receipts[key]?.status === 'stored') {
      summary.alreadySynced += 1;
      continue;
    }

    const payload = buildMemoryStorePayload(row, metadata);
    if (!payload.text.trim()) {
      summary.skippedEmpty += 1;
      continue;
    }

    if (summary.planned >= maxPerRun) break;
    summary.planned += 1;

    if (config.dryRun) continue;

    const response = await store(config, payload, adapters.clientAdapters || {});
    if (response?.ok) {
      summary.stored += 1;
      state.receipts[key] = {
        status: 'stored',
        storedAt: new Date().toISOString(),
      };
    } else {
      summary.failed += 1;
    }
  }

  if (!config.dryRun && summary.stored > 0) {
    writeJson(statePath, state, fsAdapter);
  }

  return summary;
}

function readStdin() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) raw = raw.slice(0, 1024 * 1024);
    });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', () => resolve(raw));
  });
}

async function main() {
  try {
    const raw = await readStdin();
    const input = raw.trim() ? JSON.parse(raw) : {};
    await syncAwLearningsToMemory(input);
  } catch (_error) {
    process.exitCode = 0;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildMemoryStorePayload,
  loadPendingLearningRows,
  stableLearningKey,
  syncAwLearningsToMemory,
};
