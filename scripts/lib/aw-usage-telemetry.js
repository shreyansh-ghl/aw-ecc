/**
 * AW Usage Telemetry — shared collection module.
 *
 * Two exports:
 *   buildEvent(hookInput, eventType, payload) — normalize cross-harness fields
 *   sendAsync(event) — fire-and-forget POST via detached child
 *
 * Called by individual hook scripts (post-tool-use, stop, etc.).
 * CJS module — consistent with existing aw-ecc hook ecosystem.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execSync } = require('child_process');
const crypto = require('crypto');

const SENDER_SCRIPT = path.join(__dirname, '..', 'hooks', 'aw-usage-telemetry-send.js');
const AW_HOME = path.join(os.homedir(), '.aw');
const CONFIG_PATH = path.join(AW_HOME, 'telemetry', 'config.json');
const SESSION_DIR = path.join(AW_HOME, 'telemetry', 'sessions');
const DEDUPE_DIR = path.join(os.tmpdir(), 'aw-usage-telemetry-dedupe');

// ── Git config cache (once per process) ──────────────────────────────

let _gitCache = null;

function getGitInfo() {
  if (_gitCache) return _gitCache;
  _gitCache = { user: null, email: null };
  try {
    _gitCache.user = execSync('git config user.name', { encoding: 'utf8', timeout: 3000 }).trim() || null;
  } catch { /* ignore */ }
  try {
    _gitCache.email = execSync('git config user.email', { encoding: 'utf8', timeout: 3000 }).trim() || null;
  } catch { /* ignore */ }
  return _gitCache;
}

// ── Telemetry config ─────────────────────────────────────────────────

let _configCache = null;

function generateMachineId() {
  const raw = `${os.hostname()}:${os.userInfo().username}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function loadConfig() {
  if (_configCache) return _configCache;
  try {
    _configCache = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    // Config missing or corrupt — self-heal by generating it
    _configCache = { enabled: true, machine_id: generateMachineId() };
    try {
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(_configCache, null, 2) + '\n');
    } catch { /* best effort — don't block the hook */ }
  }
  // Backfill machine_id if config exists but field is missing
  if (!_configCache.machine_id || _configCache.machine_id === 'unknown') {
    _configCache.machine_id = generateMachineId();
    try {
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(_configCache, null, 2) + '\n');
    } catch { /* best effort */ }
  }
  return _configCache;
}

// ── Opt-out check ────────────────────────────────────────────────────

function isDisabled() {
  if (process.env.DO_NOT_TRACK === '1') return true;
  if (process.env.AW_TELEMETRY_DISABLED === '1') return true;
  const cfg = loadConfig();
  return cfg.enabled === false;
}

// ── AW version ───────────────────────────────────────────────────────

let _awVersion = null;

function parseVersionString(raw) {
  if (!raw) return null;
  const match = String(raw).match(/\bv?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b/);
  return match ? match[1] : null;
}

function getAwVersion() {
  if (_awVersion) return _awVersion;
  const envVersion = parseVersionString(process.env.AW_VERSION);
  if (envVersion) {
    _awVersion = envVersion;
    return _awVersion;
  }
  try {
    const cliVersion = parseVersionString(execSync('aw --version', {
      encoding: 'utf8',
      timeout: 1500,
      stdio: ['ignore', 'pipe', 'ignore'],
    }));
    if (cliVersion) {
      _awVersion = cliVersion;
      return _awVersion;
    }
  } catch { /* ignore */ }
  const candidates = [
    path.join(AW_HOME, 'node_modules', '@ghl-ai', 'aw', 'package.json'),
  ];
  // Derive global npm prefix from the running node binary (no shell needed)
  try {
    const nodeDir = path.dirname(process.execPath);
    candidates.push(path.join(nodeDir, '..', 'lib', 'node_modules', '@ghl-ai', 'aw', 'package.json'));
  } catch { /* ignore */ }
  try {
    const globalPrefix = execSync('npm prefix -g', { encoding: 'utf8', timeout: 3000 }).trim();
    candidates.push(path.join(globalPrefix, 'lib', 'node_modules', '@ghl-ai', 'aw', 'package.json'));
  } catch { /* ignore */ }
  // aw-ecc version as last-resort fallback
  candidates.push(path.join(os.homedir(), '.aw-ecc', 'package.json'));
  for (const pkgPath of candidates) {
    try {
      _awVersion = parseVersionString(JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version) || null;
      if (_awVersion) return _awVersion;
    } catch { /* ignore */ }
  }
  _awVersion = null;
  return _awVersion;
}

// ── Harness detection ────────────────────────────────────────────────

function detectHarness(input) {
  // Explicit harness override from shell wrapper (e.g. Codex SessionStart has no turn_id)
  if (process.env.AW_HARNESS) return process.env.AW_HARNESS;
  if (input._cursor || input.conversation_id || input.cursor_version) return 'cursor';
  // Codex provides turn_id on turn-scoped hooks, Claude does not
  if (input.turn_id !== undefined) return 'codex';
  return 'claude';
}

// ── Project hash ─────────────────────────────────────────────────────

function computeProjectHash(cwd) {
  if (!cwd) return null;
  return crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 16);
}

// ── Session file cleanup ─────────────────────────────────────────────
// Prune session files older than SESSION_MAX_AGE_MS to prevent unbounded growth.
// Called once per session start — best-effort, never blocks.

const SESSION_MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72 hours

function pruneStaleSessionFiles() {
  try {
    const entries = fs.readdirSync(SESSION_DIR);
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const filePath = path.join(SESSION_DIR, entry);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > SESSION_MAX_AGE_MS) {
        fs.unlinkSync(filePath);
      }
    }
  } catch { /* best effort */ }
}

// ── Session model persistence ────────────────────────────────────────
// SessionStart captures the model; later hooks read it from disk.

function persistSessionModel(sessionId, model) {
  if (!sessionId || !model) return;
  try {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    const state = readSessionState(sessionId);
    fs.writeFileSync(path.join(SESSION_DIR, sessionId + '.json'), JSON.stringify({
      ...state,
      model,
    }));
  } catch { /* ignore */ }
}

function readSessionModel(sessionId) {
  const state = readSessionState(sessionId);
  return state.model || null;
}

function readSessionState(sessionId) {
  if (!sessionId) return {};
  try {
    const filePath = path.join(SESSION_DIR, sessionId + '.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Touch mtime so active sessions are never pruned by cleanup
    try { const now = new Date(); fs.utimesSync(filePath, now, now); } catch { /* ignore */ }
    return data;
  } catch { return {}; }
}

function persistSessionSkill(sessionId, turnId, skill) {
  if (!sessionId || !skill?.skill_name) return;
  try {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    const state = readSessionState(sessionId);
    fs.writeFileSync(path.join(SESSION_DIR, sessionId + '.json'), JSON.stringify({
      ...state,
      last_skill: {
        turn_id: turnId || null,
        skill_name: skill.skill_name,
        args: skill.args || '',
        source: skill.source || 'unknown',
        updated_at: new Date().toISOString(),
      },
    }));
  } catch { /* ignore */ }
}

function readSessionSkill(sessionId, turnId) {
  const skill = readSessionState(sessionId)?.last_skill;
  if (!skill?.skill_name) return null;
  if (turnId) {
    return skill.turn_id === turnId ? skill : null;
  }
  return skill.turn_id ? null : skill;
}

// ── Short-TTL dedupe guards ──────────────────────────────────────────

function normalizeDedupePart(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function tryAcquireDedupe(scope, parts, ttlMs = 2500) {
  const normalizedParts = Array.isArray(parts) ? parts.map(normalizeDedupePart) : [normalizeDedupePart(parts)];
  const digest = crypto.createHash('sha256')
    .update(normalizedParts.join('\n'))
    .digest('hex');
  const safeScope = String(scope || 'event').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const lockPath = path.join(DEDUPE_DIR, `${safeScope}-${digest}.lock`);

  try {
    fs.mkdirSync(DEDUPE_DIR, { recursive: true });
  } catch {
    return true;
  }

  try {
    const stat = fs.statSync(lockPath);
    if (Date.now() - stat.mtimeMs <= ttlMs) {
      return false;
    }
    fs.unlinkSync(lockPath);
  } catch { /* no active lock */ }

  try {
    fs.writeFileSync(lockPath, String(Date.now()), { flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}

// ── Codex internal-session filters ───────────────────────────────────

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

function isCodexInternalTaskTitlePrompt(input) {
  if (detectHarness(input) !== 'codex') return false;
  if (input?.transcript_path) return false;
  const prompt = resolvePromptText(input);
  return prompt.includes('Generate a concise UI title')
    && prompt.includes('User prompt:');
}

function isCodexInternalTaskTitleCompletion(input) {
  if (detectHarness(input) !== 'codex') return false;
  if (input?.transcript_path) return false;
  const rawMessage = typeof input?.last_assistant_message === 'string'
    ? input.last_assistant_message.trim()
    : '';
  if (!rawMessage) return false;
  try {
    const parsed = JSON.parse(rawMessage);
    return parsed
      && typeof parsed === 'object'
      && !Array.isArray(parsed)
      && typeof parsed.title === 'string'
      && Object.keys(parsed).length === 1;
  } catch {
    return false;
  }
}

// ── Transcript parsing ───────────────────────────────────────────────

function buildCodexUsage(entry) {
  if (entry?.type !== 'event_msg' || entry?.payload?.type !== 'token_count') return null;
  const info = entry.payload?.info || {};
  const usage = info.last_token_usage || info.total_token_usage;
  if (!usage || typeof usage !== 'object') return null;
  return {
    input_tokens: usage.input_tokens ?? null,
    output_tokens: usage.output_tokens ?? null,
    cached_input_tokens: usage.cached_input_tokens ?? null,
    reasoning_output_tokens: usage.reasoning_output_tokens ?? null,
  };
}

function isCodexAssistantEntry(entry) {
  return entry?.type === 'response_item'
    && entry?.payload?.type === 'message'
    && entry?.payload?.role === 'assistant';
}

/**
 * Read the last assistant entry from a transcript JSONL file.
 * Reads the last 256KB (enough for several entries) to avoid loading
 * the entire file which can be 10MB+.
 *
 * Works across harnesses — Claude/Cursor transcripts expose assistant
 * rows directly, while Codex writes `response_item` + `event_msg`
 * lines and surfaces usage via `token_count`.
 *
 * Returns { model, stop_reason, usage } or null.
 */
function readLastAssistantFromTranscript(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    const stat = fs.statSync(transcriptPath);
    const TAIL_BYTES = 256 * 1024;
    const start = Math.max(0, stat.size - TAIL_BYTES);
    const fd = fs.openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(Math.min(TAIL_BYTES, stat.size));
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);

    const chunk = buf.toString('utf8');
    const lines = chunk.split('\n').filter(Boolean);
    let latestCodexUsage = null;

    // Walk backward to find the last assistant entry for any harness.
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (!latestCodexUsage) {
          latestCodexUsage = buildCodexUsage(entry);
        }
        if (entry.type === 'assistant' && entry.message) {
          const msg = entry.message;
          return {
            model: msg.model || null,
            stop_reason: msg.stop_reason || null,
            usage: msg.usage || null,
          };
        }
        if (isCodexAssistantEntry(entry)) {
          return {
            model: null,
            stop_reason: null,
            usage: latestCodexUsage,
          };
        }
      } catch { /* skip malformed lines */ }
    }
  } catch { /* transcript unreadable — non-blocking */ }
  return null;
}

// ── buildEvent ───────────────────────────────────────────────────────

function buildEvent(hookInput, eventType, payload) {
  const input = hookInput || {};
  const cfg = loadConfig();
  const git = getGitInfo();
  const harness = detectHarness(input);

  // Normalize session_id: Claude/Codex use session_id, Cursor uses conversation_id
  const sessionId = input.session_id
    || input._cursor?.conversation_id
    || input.conversation_id
    || null;

  // generation_id: Cursor only
  const generationId = input.generation_id || null;

  // model: Claude only on SessionStart, Codex/Cursor on all hooks
  // Fall back to persisted session model from SessionStart
  const model = input.model
    || input._cursor?.model
    || readSessionModel(sessionId)
    || null;

  // cwd: Claude/Codex have input.cwd, Cursor uses workspace_roots
  const cwd = input.cwd
    || (input.workspace_roots && input.workspace_roots[0])
    || null;

  return {
    session_id: sessionId,
    generation_id: generationId,
    harness,
    model,
    machine_id: cfg.machine_id || 'unknown',
    github_user: git.user || input.user_email || null,
    github_email: git.email || input.user_email || null,
    project_hash: computeProjectHash(cwd),
    aw_version: getAwVersion(),
    event: eventType,
    client_ts: new Date().toISOString(),
    payload: payload || {},
  };
}

// ── sendAsync ────────────────────────────────────────────────────────

function sendAsync(event) {
  if (isDisabled()) return;
  if (!event) return;

  try {
    const child = spawn('node', [SENDER_SCRIPT, JSON.stringify(event)], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch {
    // Fire-and-forget — never block the hook.
  }
}

module.exports = {
  buildEvent,
  sendAsync,
  isDisabled,
  detectHarness,
  loadConfig,
  persistSessionModel,
  pruneStaleSessionFiles,
  readSessionModel,
  persistSessionSkill,
  readSessionSkill,
  readLastAssistantFromTranscript,
  resolvePromptText,
  tryAcquireDedupe,
  isCodexInternalTaskTitlePrompt,
  isCodexInternalTaskTitleCompletion,
};
