#!/usr/bin/env node
'use strict';

const DEFAULT_HOOK_TIMEOUT_MS = 10000;
const MIN_HOOK_TIMEOUT_MS = 100;
const MAX_HOOK_TIMEOUT_MS = 30000;
const DEFAULT_STDIN_TIMEOUT_MS = 1000;
const DEFAULT_MAX_STDIN_BYTES = 1024 * 1024;
const PROCESS_DEADLINE_GRACE_MS = 1000;

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.round(number), min), max);
}

function resolveHookTimeoutMs(env = process.env) {
  return clampNumber(
    env.AW_MEMORY_HOOK_TIMEOUT_MS,
    DEFAULT_HOOK_TIMEOUT_MS,
    MIN_HOOK_TIMEOUT_MS,
    MAX_HOOK_TIMEOUT_MS
  );
}

function resolveStdinTimeoutMs(env = process.env) {
  return Math.min(resolveHookTimeoutMs(env), DEFAULT_STDIN_TIMEOUT_MS);
}

function startHookDeadline(options = {}) {
  const timeoutMs = clampNumber(
    options.timeoutMs,
    resolveHookTimeoutMs(options.env || process.env),
    MIN_HOOK_TIMEOUT_MS,
    MAX_HOOK_TIMEOUT_MS
  );
  const graceMs = clampNumber(
    options.graceMs,
    PROCESS_DEADLINE_GRACE_MS,
    0,
    5000
  );
  const timer = setTimeout(() => {
    process.exit(0);
  }, timeoutMs + graceMs);

  return () => clearTimeout(timer);
}

function readBoundedStdin(options = {}) {
  const stream = options.stream || process.stdin;
  if (stream.isTTY) return Promise.resolve('');

  const maxBytes = clampNumber(
    options.maxBytes,
    DEFAULT_MAX_STDIN_BYTES,
    1,
    DEFAULT_MAX_STDIN_BYTES
  );
  const timeoutMs = clampNumber(
    options.timeoutMs,
    resolveStdinTimeoutMs(options.env || process.env),
    MIN_HOOK_TIMEOUT_MS,
    MAX_HOOK_TIMEOUT_MS
  );

  return new Promise((resolve) => {
    let raw = '';
    let settled = false;

    const cleanup = () => {
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('error', onError);
      clearTimeout(timeout);
    };

    const closeStream = () => {
      if (typeof stream.pause === 'function') {
        stream.pause();
      }
      if (typeof stream.destroy === 'function' && !stream.destroyed) {
        stream.destroy();
      }
    };

    const finish = (optionsForFinish = {}) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (optionsForFinish.closeStream) {
        closeStream();
      }
      resolve(raw);
    };

    const onData = (chunk) => {
      if (raw.length >= maxBytes) return;
      raw += String(chunk).slice(0, maxBytes - raw.length);
    };
    const onEnd = () => finish();
    const onError = () => finish({ closeStream: true });
    const timeout = setTimeout(() => finish({ closeStream: true }), timeoutMs);

    stream.setEncoding('utf8');
    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
  });
}

module.exports = {
  readBoundedStdin,
  resolveHookTimeoutMs,
  resolveStdinTimeoutMs,
  startHookDeadline,
};
