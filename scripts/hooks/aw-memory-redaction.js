#!/usr/bin/env node
'use strict';

const DEFAULT_MAX_CHARS = 4000;
const SECRET_KEYS = [
  'GHL_AI_MCP_BEARER_TOKEN',
  'GHL_AI_MCP_TOKEN',
  'GITHUB_TOKEN',
  'GITHUB_PAT',
  'CLICKUP_API_TOKEN',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
];

function toText(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

function replaceAndCount(text, pattern, replacement) {
  let redactions = 0;
  const value = text.replace(pattern, (...args) => {
    redactions += 1;
    return typeof replacement === 'function' ? replacement(...args) : replacement;
  });
  return { value, redactions };
}

function truncateForMemory(value, maxChars = DEFAULT_MAX_CHARS) {
  const text = toText(value);
  const limit = Number(maxChars);

  if (!Number.isFinite(limit) || limit <= 0) {
    return { value: '', truncated: text.length > 0 };
  }

  if (text.length <= limit) {
    return { value: text, truncated: false };
  }

  return {
    value: `${text.slice(0, limit)}\n[TRUNCATED ${text.length - limit} chars]`,
    truncated: true,
  };
}

function redactForMemory(value, options = {}) {
  let text = toText(value);
  let redactions = 0;

  const privateKey = replaceAndCount(
    text,
    /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
    '[REDACTED_PRIVATE_KEY]'
  );
  text = privateKey.value;
  redactions += privateKey.redactions;

  const authHeader = replaceAndCount(
    text,
    /\bAuthorization\s*:\s*(?:Bearer\s+)?[^\s\r\n]+/gi,
    'Authorization: [REDACTED_AUTH_HEADER]'
  );
  text = authHeader.value;
  redactions += authHeader.redactions;

  const keyPattern = new RegExp(`\\b(${SECRET_KEYS.join('|')})\\s*=\\s*[^\\s\\r\\n]+`, 'gi');
  const knownSecrets = replaceAndCount(text, keyPattern, (_match, key) => `${key}=[REDACTED_SECRET]`);
  text = knownSecrets.value;
  redactions += knownSecrets.redactions;

  const genericSecret = replaceAndCount(
    text,
    /\b([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*)\s*[:=]\s*["']?[^"'\s\r\n]+["']?/gi,
    (_match, key) => `${key}=[REDACTED_SECRET]`
  );
  text = genericSecret.value;
  redactions += genericSecret.redactions;

  const truncated = truncateForMemory(text.replace(/[ \t]+\n/g, '\n'), options.maxChars ?? DEFAULT_MAX_CHARS);

  return {
    value: truncated.value,
    redactions,
    truncated: truncated.truncated,
  };
}

function summarizeRedaction(result) {
  return {
    redactions: Number(result?.redactions || 0),
    truncated: Boolean(result?.truncated),
  };
}

module.exports = {
  redactForMemory,
  summarizeRedaction,
  truncateForMemory,
};

