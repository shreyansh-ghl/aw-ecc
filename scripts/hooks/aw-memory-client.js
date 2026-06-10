#!/usr/bin/env node
'use strict';

const DEFAULT_TIMEOUT_MS = 800;

function nowMs() {
  return Date.now();
}

function sanitizeMessage(message) {
  return String(message || '')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    .replace(/\b(ghp|github_pat|gho)_[A-Za-z0-9_]+/g, '[REDACTED_TOKEN]')
    .slice(0, 180);
}

function statusForHttp(status) {
  if (status === 401 || status === 403) return 'auth_failed';
  if (status >= 500) return 'server_error';
  return 'http_error';
}

function failure(status, startedAt, message, extra = {}) {
  return {
    ok: false,
    status,
    elapsedMs: Math.max(0, nowMs() - startedAt),
    message: sanitizeMessage(message),
    ...extra,
  };
}

function getFetch(adapters = {}) {
  return adapters.fetch || globalThis.fetch;
}

function buildHeaders(config) {
  return {
    'content-type': 'application/json',
    accept: 'application/json',
    ...(config?.mcp?.authHeaders || {}),
    ...(config?.namespace ? { 'X-Namespace': config.namespace } : {}),
  };
}

function isUnknownToolError(json) {
  const message = String(json?.error?.message || '');
  return /unknown tool|tool.*not found|no such tool/i.test(message);
}

async function callMemoryTool(config, toolName, args = {}, adapters = {}) {
  const startedAt = nowMs();

  if (!config?.enabled) {
    return failure('disabled', startedAt, 'AW Memory hooks disabled');
  }
  if (!config?.mcp?.url) {
    return failure('config_missing', startedAt, 'AW Memory MCP config missing');
  }

  const fetchImpl = getFetch(adapters);
  if (typeof fetchImpl !== 'function') {
    return failure('fetch_unavailable', startedAt, 'fetch is unavailable in this runtime');
  }

  const timeoutMs = Number(config.timeoutMs || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  const request = {
    jsonrpc: '2.0',
    id: `aw-memory-${startedAt}`,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  };

  try {
    const response = await fetchImpl(config.mcp.url, {
      method: 'POST',
      headers: buildHeaders(config),
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      return failure(statusForHttp(response.status), startedAt, `HTTP ${response.status}`);
    }

    let json;
    try {
      json = await response.json();
    } catch (error) {
      return failure('invalid_response', startedAt, error.message);
    }

    if (json?.error) {
      return failure(isUnknownToolError(json) ? 'unknown_tool' : 'mcp_error', startedAt, json.error.message, {
        code: json.error.code ?? null,
      });
    }

    return {
      ok: true,
      toolName,
      elapsedMs: Math.max(0, nowMs() - startedAt),
      result: json?.result ?? null,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return failure('timeout', startedAt, 'AW Memory request timed out');
    }
    return failure('transport_error', startedAt, error?.message || 'AW Memory transport error');
  } finally {
    clearTimeout(timeout);
  }
}

function memorySearch(config, args = {}, adapters = {}) {
  return callMemoryTool(config, 'memory_search', args, adapters);
}

function memoryStore(config, args = {}, adapters = {}) {
  return callMemoryTool(config, 'memory_store', args, adapters);
}

module.exports = {
  callMemoryTool,
  memorySearch,
  memoryStore,
};

