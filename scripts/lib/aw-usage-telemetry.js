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

function getAwVersion() {
  if (_awVersion) return _awVersion;
  const candidates = [
    path.join(os.homedir(), '.aw-ecc', 'package.json'),
    path.join(AW_HOME, 'node_modules', '@ghl-ai', 'aw', 'package.json'),
  ];
  try {
    const globalPrefix = execSync('npm prefix -g', { encoding: 'utf8', timeout: 3000 }).trim();
    candidates.push(path.join(globalPrefix, 'lib', 'node_modules', '@ghl-ai', 'aw', 'package.json'));
  } catch { /* ignore */ }
  for (const pkgPath of candidates) {
    try {
      _awVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || null;
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

// ── Session model persistence ────────────────────────────────────────
// SessionStart captures the model; later hooks read it from disk.

function persistSessionModel(sessionId, model) {
  if (!sessionId || !model) return;
  try {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    fs.writeFileSync(path.join(SESSION_DIR, sessionId + '.json'), JSON.stringify({ model }));
  } catch { /* ignore */ }
}

function readSessionModel(sessionId) {
  if (!sessionId) return null;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(SESSION_DIR, sessionId + '.json'), 'utf8'));
    return data.model || null;
  } catch { return null; }
}

// ── Transcript parsing ───────────────────────────────────────────────

/**
 * Read the last assistant entry from a transcript JSONL file.
 * Reads the last 64KB (enough for several entries) to avoid loading
 * the entire file which can be 10MB+.
 *
 * Works across harnesses — Claude, Cursor, and Codex all provide
 * transcript_path. The parser looks for `type: "assistant"` entries;
 * if the transcript format differs, it returns null gracefully.
 *
 * Returns { model, stop_reason, usage } or null.
 */
function readLastAssistantFromTranscript(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    const stat = fs.statSync(transcriptPath);
    const TAIL_BYTES = 64 * 1024;
    const start = Math.max(0, stat.size - TAIL_BYTES);
    const fd = fs.openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(Math.min(TAIL_BYTES, stat.size));
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);

    const chunk = buf.toString('utf8');
    const lines = chunk.split('\n').filter(Boolean);

    // Walk backward to find the last assistant entry
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === 'assistant' && entry.message) {
          const msg = entry.message;
          return {
            model: msg.model || null,
            stop_reason: msg.stop_reason || null,
            usage: msg.usage || null,
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

module.exports = { buildEvent, sendAsync, isDisabled, detectHarness, loadConfig, persistSessionModel, readLastAssistantFromTranscript };
