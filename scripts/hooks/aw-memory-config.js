#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const SERVER_NAME = 'ghl-ai';
const PREFS_FILE = 'memory-hooks-preferences.json';
const DEFAULT_MCP_URL = 'https://services.leadconnectorhq.com/agentic-workspace/mcp';
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RESULTS = 3;
const DEFAULT_SYNC_MAX_PER_RUN = 5;
const DEFAULT_CAPTURE_MAX_CHARS = 12000;

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function truthy(value) {
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(String(value || '').trim().toLowerCase());
}

function falsy(value) {
  return ['0', 'false', 'no', 'off', 'disabled'].includes(String(value || '').trim().toLowerCase());
}

function envFlag(env, name) {
  if (!hasOwn(env, name)) return null;
  if (truthy(env[name])) return true;
  if (falsy(env[name])) return false;
  return null;
}

function prefBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (truthy(value)) return true;
  if (falsy(value)) return false;
  return fallback;
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.round(number), min), max);
}

function readJsonFile(fsAdapter, filePath, diagnostics) {
  try {
    if (!fsAdapter.existsSync(filePath)) return null;
    return JSON.parse(fsAdapter.readFileSync(filePath, 'utf8'));
  } catch (error) {
    diagnostics.push({ code: 'json_read_failed', filePath, message: error.message });
    return null;
  }
}

function readTextFile(fsAdapter, filePath, diagnostics) {
  try {
    if (!fsAdapter.existsSync(filePath)) return null;
    return fsAdapter.readFileSync(filePath, 'utf8');
  } catch (error) {
    diagnostics.push({ code: 'text_read_failed', filePath, message: error.message });
    return null;
  }
}

function memoryPrefsPath(homeDir) {
  return path.join(homeDir, '.aw', PREFS_FILE);
}

function loadPreferences(env, fsAdapter, homeDir, diagnostics) {
  const prefsPath = env.AW_MEMORY_PREFERENCES_PATH
    ? path.resolve(env.AW_MEMORY_PREFERENCES_PATH)
    : memoryPrefsPath(homeDir);
  const prefs = readJsonFile(fsAdapter, prefsPath, diagnostics);

  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) {
    return { prefs: {}, prefsPath };
  }

  return { prefs, prefsPath };
}

function authHeadersFromEnv(env, envVar) {
  if (envVar && env[envVar]) {
    return { Authorization: `Bearer ${env[envVar]}` };
  }
  if (env.GHL_AI_MCP_BEARER_TOKEN) {
    return { Authorization: `Bearer ${env.GHL_AI_MCP_BEARER_TOKEN}` };
  }
  if (env.GITHUB_TOKEN) {
    return { Authorization: `Bearer ${env.GITHUB_TOKEN}` };
  }
  return {};
}

function normalizeHeaders(headers) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return {};
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string' && value.trim()) out[key] = value;
  }
  return out;
}

function serverFromJson(data, source) {
  const server = data?.mcpServers?.[SERVER_NAME]
    || data?.mcp_servers?.[SERVER_NAME]
    || null;

  if (!server || typeof server !== 'object' || Array.isArray(server)) return null;

  return {
    source,
    url: typeof server.url === 'string' ? server.url : '',
    authEnvVar: typeof server.bearer_token_env_var === 'string' ? server.bearer_token_env_var : null,
    authHeaders: normalizeHeaders(server.headers || server.env_http_headers),
  };
}

function parseTomlSection(content, sectionName) {
  const lines = String(content || '').split(/\r?\n/);
  const sectionHeader = `[${sectionName}]`;
  const values = {};
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      inSection = trimmed === sectionHeader;
      continue;
    }
    if (!inSection) continue;

    const match = trimmed.match(/^([A-Za-z0-9_.-]+)\s*=\s*["']?([^"']+)["']?\s*$/);
    if (match) values[match[1]] = match[2].trim();
  }

  return values;
}

function serverFromToml(content, source, env) {
  const values = parseTomlSection(content, `mcp_servers.${SERVER_NAME}`);
  if (!values.url && !values.bearer_token_env_var) return null;
  return {
    source,
    url: values.url || '',
    authEnvVar: values.bearer_token_env_var || null,
    authHeaders: authHeadersFromEnv(env, values.bearer_token_env_var),
  };
}

function configCandidates(homeDir) {
  return [
    { kind: 'json', filePath: path.join(homeDir, '.claude.json') },
    { kind: 'json', filePath: path.join(homeDir, '.claude', 'settings.json') },
    { kind: 'json', filePath: path.join(homeDir, '.cursor', 'mcp.json') },
    { kind: 'toml', filePath: path.join(homeDir, '.codex', 'config.toml') },
    { kind: 'toml', filePath: path.join(homeDir, '.aw-ecc', '.codex', 'config.toml') },
  ];
}

function resolveMcpConfig(env, fsAdapter, homeDir, diagnostics) {
  const envUrl = env.AW_MEMORY_MCP_URL || env.GHL_AI_MCP_URL || env.GHL_MCP_URL || '';
  if (envUrl) {
    return {
      serverName: SERVER_NAME,
      source: 'env',
      url: envUrl,
      authHeaders: authHeadersFromEnv(env),
      authEnvVar: env.GHL_AI_MCP_BEARER_TOKEN ? 'GHL_AI_MCP_BEARER_TOKEN' : (env.GITHUB_TOKEN ? 'GITHUB_TOKEN' : null),
    };
  }

  for (const candidate of configCandidates(homeDir)) {
    if (candidate.kind === 'json') {
      const data = readJsonFile(fsAdapter, candidate.filePath, diagnostics);
      const server = serverFromJson(data, candidate.filePath);
      if (server?.url) {
        return {
          serverName: SERVER_NAME,
          ...server,
          authHeaders: Object.keys(server.authHeaders).length
            ? server.authHeaders
            : authHeadersFromEnv(env, server.authEnvVar),
        };
      }
      continue;
    }

    const content = readTextFile(fsAdapter, candidate.filePath, diagnostics);
    const server = serverFromToml(content, candidate.filePath, env);
    if (server?.url) {
      return {
        serverName: SERVER_NAME,
        ...server,
      };
    }
  }

  return {
    serverName: SERVER_NAME,
    source: 'default',
    url: DEFAULT_MCP_URL,
    authHeaders: authHeadersFromEnv(env),
    authEnvVar: env.GHL_AI_MCP_BEARER_TOKEN ? 'GHL_AI_MCP_BEARER_TOKEN' : (env.GITHUB_TOKEN ? 'GITHUB_TOKEN' : null),
  };
}

function valueFromEnvOrPrefs(env, envName, prefs, prefName, fallback) {
  return hasOwn(env, envName) ? env[envName] : (hasOwn(prefs, prefName) ? prefs[prefName] : fallback);
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function syncConfigRelativePaths() {
  return [
    path.join('.aw', '.aw_registry', '.sync-config.json'),
    path.join('.aw_registry', '.sync-config.json'),
    '.sync-config.json',
  ];
}

function addUniquePath(paths, filePath) {
  if (filePath && !paths.includes(filePath)) paths.push(filePath);
}

function findUpSyncConfigPaths(startDir, fsAdapter) {
  const paths = [];
  let current = path.resolve(startDir || process.cwd());

  while (current && current !== path.dirname(current)) {
    for (const relativePath of syncConfigRelativePaths()) {
      const candidate = path.join(current, relativePath);
      if (fsAdapter.existsSync(candidate)) addUniquePath(paths, candidate);
    }
    current = path.dirname(current);
  }

  return paths;
}

function syncConfigCandidates(cwd, homeDir, fsAdapter) {
  const paths = [];
  for (const startDir of [cwd, process.cwd()]) {
    if (!startDir) continue;
    for (const candidate of findUpSyncConfigPaths(startDir, fsAdapter)) {
      addUniquePath(paths, candidate);
    }
  }
  for (const relativePath of [
    path.join('.aw', '.aw_registry', '.sync-config.json'),
    path.join('.aw_registry', '.sync-config.json'),
  ]) {
    addUniquePath(paths, path.join(homeDir, relativePath));
  }
  return paths;
}

function normalizeNamespaceCandidate(value) {
  const text = firstString(value)
    .replace(/\\/g, '/')
    .replace(/^\.?aw_registry\//, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/\*\*?$/g, '');
  if (!text) return '';

  const artifactIndex = text
    .split('/')
    .findIndex((segment) => ['agents', 'commands', 'contexts', 'docs', 'evals', 'rules', 'skills'].includes(segment));
  if (artifactIndex > 0) {
    return text.split('/').slice(0, artifactIndex).join('/');
  }

  return text;
}

function namespaceFromSyncConfig(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return '';

  const explicit = normalizeNamespaceCandidate(data?.namespace);
  if (explicit) return explicit;

  const included = Array.isArray(data?.include)
    ? data.include.map(normalizeNamespaceCandidate).filter(Boolean)
    : [];
  if (included.length > 0) return included[0];

  return 'platform';
}

function resolveNamespace(env, fsAdapter, homeDir, diagnostics, cwd) {
  const envNamespace = firstString(env.AW_MEMORY_NAMESPACE, env.X_NAMESPACE);
  if (envNamespace) return { namespace: envNamespace, source: 'env' };

  for (const candidate of syncConfigCandidates(cwd, homeDir, fsAdapter)) {
    const data = readJsonFile(fsAdapter, candidate, diagnostics);
    const namespace = namespaceFromSyncConfig(data);
    if (namespace) return { namespace, source: candidate };
  }

  return { namespace: null, source: null };
}

function getAwMemoryHookConfig(env = process.env, fsAdapter = fs, homeDir = os.homedir(), cwd = process.cwd()) {
  const diagnostics = [];
  const { prefs, prefsPath } = loadPreferences(env, fsAdapter, homeDir, diagnostics);
  const namespace = resolveNamespace(env, fsAdapter, homeDir, diagnostics, cwd);

  const envEnabled = envFlag(env, 'AW_MEMORY_HOOKS');
  const prefEnabled = prefs.mode === 'enabled' ? true : prefs.mode === 'disabled' ? false : true;
  const enabled = envEnabled === null ? prefEnabled : envEnabled;

  const recallFlag = envFlag(env, 'AW_MEMORY_RECALL');
  const syncFlag = envFlag(env, 'AW_MEMORY_SYNC');
  const intentFlag = envFlag(env, 'AW_MEMORY_INTENT');
  const captureFlag = envFlag(env, 'AW_MEMORY_CAPTURE');
  const cursorFlag = envFlag(env, 'AW_MEMORY_CURSOR_PROMPT_INJECTION');
  const dryRunFlag = envFlag(env, 'AW_MEMORY_DRY_RUN');
  const debugFlag = envFlag(env, 'AW_MEMORY_DEBUG');

  const timeoutMs = clampNumber(
    valueFromEnvOrPrefs(env, 'AW_MEMORY_HOOK_TIMEOUT_MS', prefs, 'timeoutMs', DEFAULT_TIMEOUT_MS),
    DEFAULT_TIMEOUT_MS,
    100,
    MAX_TIMEOUT_MS
  );
  const maxResults = clampNumber(
    valueFromEnvOrPrefs(env, 'AW_MEMORY_MAX_RESULTS', prefs, 'maxResults', DEFAULT_MAX_RESULTS),
    DEFAULT_MAX_RESULTS,
    1,
    10
  );
  const syncMaxPerRun = clampNumber(
    valueFromEnvOrPrefs(env, 'AW_MEMORY_SYNC_MAX_PER_RUN', prefs, 'syncMaxPerRun', DEFAULT_SYNC_MAX_PER_RUN),
    DEFAULT_SYNC_MAX_PER_RUN,
    1,
    25
  );
  const captureMaxChars = clampNumber(
    valueFromEnvOrPrefs(env, 'AW_MEMORY_CAPTURE_MAX_CHARS', prefs, 'captureMaxChars', DEFAULT_CAPTURE_MAX_CHARS),
    DEFAULT_CAPTURE_MAX_CHARS,
    1000,
    50000
  );

  return {
    enabled,
    intentEnabled: enabled && (intentFlag === null ? prefBool(prefs.intent, true) : intentFlag),
    recallEnabled: enabled && (recallFlag === null ? prefBool(prefs.recall, true) : recallFlag),
    captureEnabled: enabled && (captureFlag === null ? prefBool(prefs.capture, true) : captureFlag),
    syncEnabled: enabled && (syncFlag === null ? prefBool(prefs.sync, true) : syncFlag),
    cursorPromptInjectionEnabled: enabled && (cursorFlag === null ? prefBool(prefs.cursorPromptInjection, false) : cursorFlag),
    dryRun: dryRunFlag === null ? prefBool(prefs.dryRun, false) : dryRunFlag,
    debugEnabled: debugFlag === null ? prefBool(prefs.debug, false) : debugFlag,
    timeoutMs,
    maxResults,
    syncMaxPerRun,
    captureMaxChars,
    prefsPath,
    mcp: resolveMcpConfig(env, fsAdapter, homeDir, diagnostics),
    namespace: namespace.namespace,
    namespaceSource: namespace.source,
    diagnostics,
  };
}

function isMemoryHooksEnabled(config) {
  return config?.enabled === true;
}

function redactConfigForLog(config) {
  const authHeaders = config?.mcp?.authHeaders || {};
  return {
    enabled: Boolean(config?.enabled),
    intentEnabled: Boolean(config?.intentEnabled),
    recallEnabled: Boolean(config?.recallEnabled),
    captureEnabled: Boolean(config?.captureEnabled),
    syncEnabled: Boolean(config?.syncEnabled),
    cursorPromptInjectionEnabled: Boolean(config?.cursorPromptInjectionEnabled),
    dryRun: Boolean(config?.dryRun),
    debugEnabled: Boolean(config?.debugEnabled),
    timeoutMs: config?.timeoutMs,
    maxResults: config?.maxResults,
    syncMaxPerRun: config?.syncMaxPerRun,
    captureMaxChars: config?.captureMaxChars,
    prefsPath: config?.prefsPath || null,
    namespace: config?.namespace || null,
    namespaceSource: config?.namespaceSource || null,
    mcp: {
      serverName: config?.mcp?.serverName || SERVER_NAME,
      source: config?.mcp?.source || null,
      url: config?.mcp?.url || '',
      authEnvVar: config?.mcp?.authEnvVar || null,
      hasAuth: Object.keys(authHeaders).length > 0,
    },
    diagnostics: Array.isArray(config?.diagnostics) ? config.diagnostics : [],
  };
}

module.exports = {
  DEFAULT_MCP_URL,
  DEFAULT_MAX_RESULTS,
  DEFAULT_CAPTURE_MAX_CHARS,
  DEFAULT_SYNC_MAX_PER_RUN,
  DEFAULT_TIMEOUT_MS,
  PREFS_FILE,
  SERVER_NAME,
  getAwMemoryHookConfig,
  isMemoryHooksEnabled,
  memoryPrefsPath,
  redactConfigForLog,
};
