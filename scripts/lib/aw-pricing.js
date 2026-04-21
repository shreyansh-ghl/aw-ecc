/**
 * AW Pricing — dynamic LLM cost estimation.
 *
 * Resolution order:
 *   1. In-process memory cache
 *   2. Disk cache (~/.aw/telemetry/pricing-cache.json, 24h TTL)
 *   3. OpenRouter /api/v1/models fetch (3s timeout, no auth)
 *   4. Hardcoded FALLBACK_PRICING (last resort)
 *   5. null (model not found anywhere)
 *
 * CJS module — consistent with existing aw-ecc hook ecosystem.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const CACHE_PATH = path.join(os.homedir(), '.aw', 'telemetry', 'pricing-cache.json');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT = 3000; // 3 seconds
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/models';

// ── Hardcoded fallback (last resort when API + cache both fail) ──────

const FALLBACK_PRICING = {
  // Anthropic Claude (latest generation pricing)
  'haiku':   { in: 1.00, out: 5.00 },
  'sonnet':  { in: 3.00, out: 15.00 },
  'opus':    { in: 5.00, out: 25.00 },
  // OpenAI — GPT
  'gpt-5':        { in: 1.25, out: 10.00 },
  'gpt-5-mini':   { in: 0.25, out: 2.00 },
  'gpt-4o':       { in: 2.50, out: 10.00 },
  'gpt-4o-mini':  { in: 0.15, out: 0.60 },
  'gpt-4.1':      { in: 2.00, out: 8.00 },
  'gpt-4.1-mini': { in: 0.40, out: 1.60 },
  'gpt-4.1-nano': { in: 0.10, out: 0.40 },
  // OpenAI — reasoning
  'o1':           { in: 15.00, out: 60.00 },
  'o1-mini':      { in: 1.10, out: 4.40 },
  'o3':           { in: 2.00, out: 8.00 },
  'o3-mini':      { in: 1.10, out: 4.40 },
  'o4-mini':      { in: 1.10, out: 4.40 },
  // OpenAI — Codex CLI
  'codex-mini':       { in: 1.50, out: 6.00 },
  'codex-1':          { in: 1.50, out: 6.00 },
  // OpenAI — GPT Codex (agentic coding)
  'gpt-5.1-codex-mini': { in: 0.25, out: 2.00 },
  'gpt-5.1-codex':      { in: 1.25, out: 10.00 },
  'gpt-5.2-codex':      { in: 1.75, out: 14.00 },
  'gpt-5.3-codex':      { in: 1.75, out: 14.00 },
  // Google Gemini
  'gemini-2.5-pro':        { in: 1.25, out: 10.00 },
  'gemini-2.5-flash':      { in: 0.30, out: 2.50 },
  'gemini-2.5-flash-lite': { in: 0.10, out: 0.40 },
};

// ── Helpers ──────────────────────────────────────────────────────────

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// ── Memory cache ─────────────────────────────────────────────────────

let _pricingCache = null; // { models: { [key]: { in, out } }, fetched_at: string }

// ── Disk cache ───────────────────────────────────────────────────────

function readDiskCache() {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (data && data.models && data.fetched_at) {
      return data;
    }
  } catch { /* missing or corrupt — non-blocking */ }
  return null;
}

function writeDiskCache(data) {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2) + '\n');
  } catch { /* best effort */ }
}

function isCacheStale(cacheData) {
  if (!cacheData || !cacheData.fetched_at) return true;
  const age = Date.now() - new Date(cacheData.fetched_at).getTime();
  return age > CACHE_TTL;
}

// ── OpenRouter fetch ─────────────────────────────────────────────────

function normalizeOpenRouterResponse(data) {
  const models = {};
  if (!Array.isArray(data)) return models;

  for (const entry of data) {
    if (!entry.id || !entry.pricing) continue;
    const prompt = parseFloat(entry.pricing.prompt);
    const completion = parseFloat(entry.pricing.completion);
    if (!Number.isFinite(prompt) || !Number.isFinite(completion)) continue;

    // Per-token → per-1M-token
    const inRate = prompt * 1_000_000;
    const outRate = completion * 1_000_000;

    // Store under full OpenRouter id (e.g. "anthropic/claude-3.5-sonnet")
    models[entry.id] = { in: inRate, out: outRate };

    // Also store under the model slug after the slash (e.g. "claude-3.5-sonnet")
    const slash = entry.id.indexOf('/');
    if (slash > 0) {
      const slug = entry.id.substring(slash + 1);
      // Don't overwrite if slug already exists (first provider wins)
      if (!models[slug]) {
        models[slug] = { in: inRate, out: outRate };
      }
    }
  }

  return models;
}

/**
 * Fetch pricing from OpenRouter. Returns a Promise that resolves to
 * { models, fetched_at } or null on failure.
 */
function fetchPricing() {
  return new Promise((resolve) => {
    const req = https.get(OPENROUTER_URL, { timeout: FETCH_TIMEOUT }, (res) => {
      if (res.statusCode !== 200) {
        res.resume(); // drain
        resolve(null);
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const models = normalizeOpenRouterResponse(json.data);
          if (Object.keys(models).length === 0) {
            resolve(null);
            return;
          }
          const cacheData = {
            fetched_at: new Date().toISOString(),
            model_count: Object.keys(models).length,
            models,
          };
          resolve(cacheData);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Non-blocking background refresh. Fetches pricing and updates both
 * disk and memory caches. Never throws, never blocks the caller.
 */
function refreshPricingAsync() {
  fetchPricing().then((data) => {
    if (data) {
      writeDiskCache(data);
      _pricingCache = data;
    }
  }).catch(() => { /* swallow — non-blocking */ });
}

// ── Load pricing (sync) ─────────────────────────────────────────────

/**
 * Returns cached pricing data or null. Never fetches synchronously.
 * Triggers a background refresh when cache is stale.
 */
function loadPricingSync() {
  // 1. Memory cache
  if (_pricingCache && !isCacheStale(_pricingCache)) {
    return _pricingCache;
  }

  // 2. Disk cache
  const diskData = readDiskCache();
  if (diskData) {
    _pricingCache = diskData;
    if (isCacheStale(diskData)) {
      // Use stale data now, refresh in background for next time
      refreshPricingAsync();
    }
    return _pricingCache;
  }

  // 3. No cache at all — trigger background fetch for next time
  refreshPricingAsync();
  return null;
}

// ── Model matching ───────────────────────────────────────────────────

/**
 * Fuzzy-match a model string against a pricing map.
 * Tries exact match first, then substring includes.
 */
function findRates(model, pricingMap) {
  if (!model || !pricingMap) return null;
  const normalized = String(model).toLowerCase();

  // Exact match
  if (pricingMap[normalized]) return pricingMap[normalized];

  // Match against keys using includes (both directions)
  for (const [key, rates] of Object.entries(pricingMap)) {
    const lowerKey = key.toLowerCase();
    if (normalized.includes(lowerKey) || lowerKey.includes(normalized)) {
      return rates;
    }
  }

  return null;
}

// ── estimateCost ─────────────────────────────────────────────────────

/**
 * Estimate the cost in USD for a model call.
 *
 * @param {string} model - Model identifier (e.g. "claude-sonnet-4-20250514", "gpt-4o")
 * @param {number} inputTokens - Total input/prompt token count (includes cache tokens)
 * @param {number} outputTokens - Output/completion token count
 * @param {object} [opts] - Optional cache token breakdown
 * @param {number} [opts.cacheReadTokens]  - Tokens served from cache (billed at ~10% of input rate)
 * @param {number} [opts.cacheWriteTokens] - Tokens written to cache (billed at ~125% of input rate)
 * @returns {number|null} Estimated cost in USD, or null if unknown model or no tokens
 */
function estimateCost(model, inputTokens, outputTokens, opts) {
  if (!inputTokens && !outputTokens) return null;

  const cacheRead = (opts && opts.cacheReadTokens) || 0;
  const cacheWrite = (opts && opts.cacheWriteTokens) || 0;

  function computeCost(rates) {
    if (!rates) return null;
    const inRate = rates.in;
    const outRate = rates.out;

    if (cacheRead || cacheWrite) {
      const nonCached = Math.max(0, inputTokens - cacheRead - cacheWrite);
      const cost =
        (nonCached / 1_000_000) * inRate +
        (cacheRead / 1_000_000) * (inRate * 0.1) +
        (cacheWrite / 1_000_000) * (inRate * 1.25) +
        (outputTokens / 1_000_000) * outRate;
      return Math.round(cost * 1e6) / 1e6;
    }

    const cost = (inputTokens / 1_000_000) * inRate + (outputTokens / 1_000_000) * outRate;
    return Math.round(cost * 1e6) / 1e6;
  }

  // Try dynamic pricing first (OpenRouter cache)
  const cached = loadPricingSync();
  if (cached && cached.models) {
    const result = computeCost(findRates(model, cached.models));
    if (result !== null) return result;
  }

  // Fallback to hardcoded pricing
  const result = computeCost(findRates(model, FALLBACK_PRICING));
  if (result !== null) return result;

  // Model not found anywhere
  return null;
}

module.exports = {
  estimateCost,
  toNumber,
  loadPricingSync,
  refreshPricingAsync,
  FALLBACK_PRICING,
  // Exposed for testing
  _test: {
    readDiskCache,
    writeDiskCache,
    isCacheStale,
    normalizeOpenRouterResponse,
    findRates,
    CACHE_PATH,
    CACHE_TTL,
  },
};
