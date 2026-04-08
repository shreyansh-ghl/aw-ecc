#!/usr/bin/env node
/**
 * Telemetry Constants — single source of truth for pricing, paths, and config.
 *
 * Pricing uses a hardcoded fallback + cached API pricing from OpenRouter.
 * At SessionStart, pricing is fetched from OpenRouter's public /api/v1/models
 * endpoint and cached to ~/.aw/telemetry/pricing.json. Stop/PreCompact/SessionEnd
 * hooks read the cached file, falling back to FALLBACK_PRICING if unavailable.
 */

'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Paths — vendor-agnostic, shared across Claude / Cursor / Codex
// ---------------------------------------------------------------------------

const AW_DIR = path.join(os.homedir(), '.aw');
const TELEMETRY_DIR = path.join(AW_DIR, 'telemetry');
const COSTS_FILE = path.join(TELEMETRY_DIR, 'costs.jsonl');
const CHECKPOINT_FILE = path.join(TELEMETRY_DIR, 'checkpoint.json');
const QUEUE_FILE = path.join(TELEMETRY_DIR, 'queue.jsonl');
const SPANS_BUFFER_FILE = path.join(TELEMETRY_DIR, 'spans-buffer.jsonl');
const PRICING_CACHE_FILE = path.join(TELEMETRY_DIR, 'pricing.json');

// ---------------------------------------------------------------------------
// Queue limits
// ---------------------------------------------------------------------------

const QUEUE_MAX_ITEMS = 200;
const QUEUE_TTL_DAYS = 7;

// ---------------------------------------------------------------------------
// Fallback pricing — per 1M tokens, USD
// Used when OpenRouter cache is unavailable (offline, first run, fetch failure).
// ---------------------------------------------------------------------------

const FALLBACK_PRICING = {
  'haiku':  { input: 0.80,  output: 4.00,  cacheRead: 0.08,  cacheCreation: 1.00  },
  'sonnet': { input: 3.00,  output: 15.00, cacheRead: 0.30,  cacheCreation: 3.75  },
  'opus':   { input: 15.00, output: 75.00, cacheRead: 1.50,  cacheCreation: 18.75 },
};

// ---------------------------------------------------------------------------
// OpenRouter pricing fetch
// ---------------------------------------------------------------------------

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const PRICING_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch pricing from OpenRouter and cache to disk.
 * Non-blocking — if fetch fails, returns false silently.
 * @returns {Promise<boolean>} true if pricing was successfully cached
 */
async function fetchAndCachePricing() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(OPENROUTER_MODELS_URL, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) return false;

    const json = await res.json();
    if (!json.data || !Array.isArray(json.data)) return false;

    // Extract Anthropic models and normalize pricing
    const pricing = {};
    for (const model of json.data) {
      if (!model.id || !model.pricing) continue;

      // We care about all models, not just Anthropic — cost estimation
      // should work for any model routed through the hook.
      const p = model.pricing;
      pricing[model.id] = {
        input: parseFloat(p.prompt || '0') * 1_000_000,   // per-token -> per-1M
        output: parseFloat(p.completion || '0') * 1_000_000,
        cacheRead: parseFloat(p.cache_read || p.prompt || '0') * 1_000_000,
        cacheCreation: parseFloat(p.cache_creation || p.prompt || '0') * 1_000_000,
      };
    }

    // Ensure telemetry dir exists
    if (!fs.existsSync(TELEMETRY_DIR)) {
      fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    }

    fs.writeFileSync(PRICING_CACHE_FILE, JSON.stringify({
      fetched_at: new Date().toISOString(),
      pricing,
    }), 'utf8');

    return true;
  } catch {
    return false;
  }
}

/**
 * Load cached pricing from disk. Returns null if cache is missing or stale.
 */
function loadCachedPricing() {
  try {
    if (!fs.existsSync(PRICING_CACHE_FILE)) return null;

    const raw = fs.readFileSync(PRICING_CACHE_FILE, 'utf8');
    const data = JSON.parse(raw);

    // Check staleness
    const fetchedAt = new Date(data.fetched_at).getTime();
    if (Date.now() - fetchedAt > PRICING_CACHE_MAX_AGE_MS) return null;

    return data.pricing || null;
  } catch {
    return null;
  }
}

/**
 * Resolve pricing rates for a model string.
 * Tries cached OpenRouter pricing first, falls back to FALLBACK_PRICING.
 *
 * @param {string} model - Model identifier (e.g. 'claude-sonnet-4-6', 'claude-opus-4-6')
 * @returns {{ input: number, output: number, cacheRead: number, cacheCreation: number }}
 */
function getPricingForModel(model) {
  const normalized = String(model || '').toLowerCase();

  // Try cached OpenRouter pricing (exact match first)
  const cached = loadCachedPricing();
  if (cached) {
    // Exact match (e.g. 'anthropic/claude-sonnet-4-6')
    if (cached[model]) return cached[model];
    if (cached[`anthropic/${model}`]) return cached[`anthropic/${model}`];

    // Fuzzy match — find first key containing the model name
    for (const [key, rates] of Object.entries(cached)) {
      if (key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())) {
        return rates;
      }
    }
  }

  // Fallback to hardcoded rates
  if (normalized.includes('haiku')) return FALLBACK_PRICING.haiku;
  if (normalized.includes('opus')) return FALLBACK_PRICING.opus;
  // Default to sonnet rates for unknown models
  return FALLBACK_PRICING.sonnet;
}

// ---------------------------------------------------------------------------
// API URL resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the API base URL.
 * Priority: AW_API_URL env > ~/.aw/config.json > production default.
 */
function getApiUrl() {
  // 1. Environment variable
  if (process.env.AW_API_URL) {
    return process.env.AW_API_URL.replace(/\/+$/, '');
  }

  // 2. Config file
  try {
    const configPath = path.join(AW_DIR, 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.api_url) {
        return config.api_url.replace(/\/+$/, '');
      }
    }
  } catch {
    // Fall through to default
  }

  // 3. Production default
  return 'https://aw-api.gohighlevel.com';
}

module.exports = {
  // Paths
  AW_DIR,
  TELEMETRY_DIR,
  COSTS_FILE,
  CHECKPOINT_FILE,
  QUEUE_FILE,
  SPANS_BUFFER_FILE,
  PRICING_CACHE_FILE,

  // Limits
  QUEUE_MAX_ITEMS,
  QUEUE_TTL_DAYS,

  // Pricing
  FALLBACK_PRICING,
  fetchAndCachePricing,
  loadCachedPricing,
  getPricingForModel,

  // API
  getApiUrl,
};
