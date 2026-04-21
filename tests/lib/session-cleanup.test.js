/**
 * Tests for session file cleanup (pruneStaleSessionFiles) and
 * mtime-touch-on-read behavior in aw-usage-telemetry.js.
 *
 * Run with: node tests/lib/session-cleanup.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Redirect HOME so the module writes to a temp dir
const tmpHome = path.join(os.tmpdir(), `ecc-session-cleanup-test-${Date.now()}`);
fs.mkdirSync(path.join(tmpHome, '.aw', 'telemetry', 'sessions'), { recursive: true });
const origHome = process.env.HOME;
const origUserProfile = process.env.USERPROFILE;
process.env.HOME = tmpHome;
process.env.USERPROFILE = tmpHome;

// Disable telemetry sending during tests
process.env.DO_NOT_TRACK = '1';

const telemetry = require('../../scripts/lib/aw-usage-telemetry');

const SESSION_DIR = path.join(tmpHome, '.aw', 'telemetry', 'sessions');

// Test helper
function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function cleanSessionDir() {
  for (const f of fs.readdirSync(SESSION_DIR)) {
    fs.unlinkSync(path.join(SESSION_DIR, f));
  }
}

function createSessionFile(name, content, ageMs) {
  const filePath = path.join(SESSION_DIR, name);
  fs.writeFileSync(filePath, JSON.stringify(content));
  if (ageMs) {
    const past = new Date(Date.now() - ageMs);
    fs.utimesSync(filePath, past, past);
  }
  return filePath;
}

function runTests() {
  console.log('\n=== Testing session file cleanup ===\n');

  let passed = 0;
  let failed = 0;

  // ── pruneStaleSessionFiles ─────────────────────────────────────────

  console.log('pruneStaleSessionFiles:');

  if (test('removes session files older than 72 hours', () => {
    cleanSessionDir();
    const hours73 = 73 * 60 * 60 * 1000;
    createSessionFile('old-session.json', { model: 'test' }, hours73);
    createSessionFile('fresh-session.json', { model: 'test' }, 0);

    telemetry.pruneStaleSessionFiles();

    assert.strictEqual(fs.existsSync(path.join(SESSION_DIR, 'old-session.json')), false,
      'old file should be deleted');
    assert.strictEqual(fs.existsSync(path.join(SESSION_DIR, 'fresh-session.json')), true,
      'fresh file should be kept');
  })) passed++; else failed++;

  if (test('keeps session files younger than 72 hours', () => {
    cleanSessionDir();
    const hours71 = 71 * 60 * 60 * 1000;
    createSessionFile('recent-session.json', { model: 'test' }, hours71);

    telemetry.pruneStaleSessionFiles();

    assert.strictEqual(fs.existsSync(path.join(SESSION_DIR, 'recent-session.json')), true,
      'file under 72h should survive');
  })) passed++; else failed++;

  if (test('ignores non-json files', () => {
    cleanSessionDir();
    const hours73 = 73 * 60 * 60 * 1000;
    const nonJsonPath = path.join(SESSION_DIR, 'readme.txt');
    fs.writeFileSync(nonJsonPath, 'keep me');
    const past = new Date(Date.now() - hours73);
    fs.utimesSync(nonJsonPath, past, past);

    telemetry.pruneStaleSessionFiles();

    assert.strictEqual(fs.existsSync(nonJsonPath), true,
      'non-json file should not be pruned');
  })) passed++; else failed++;

  if (test('does not throw when session dir is empty', () => {
    cleanSessionDir();
    telemetry.pruneStaleSessionFiles(); // should not throw
  })) passed++; else failed++;

  if (test('does not throw when session dir does not exist', () => {
    // Remove the dir entirely
    fs.rmSync(SESSION_DIR, { recursive: true });
    telemetry.pruneStaleSessionFiles(); // should not throw
    // Recreate for subsequent tests
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  })) passed++; else failed++;

  // ── mtime touch on read ────────────────────────────────────────────

  console.log('\nreadSessionState mtime touch:');

  if (test('reading a session file updates its mtime', () => {
    cleanSessionDir();
    const sessionId = 'mtime-touch-test';
    const hours50 = 50 * 60 * 60 * 1000;
    createSessionFile(sessionId + '.json', { model: 'opus' }, hours50);

    const filePath = path.join(SESSION_DIR, sessionId + '.json');
    const oldMtime = fs.statSync(filePath).mtimeMs;

    // readSessionModel internally calls readSessionState which touches mtime
    const model = telemetry.readSessionModel(sessionId);
    assert.strictEqual(model, 'opus');

    const newMtime = fs.statSync(filePath).mtimeMs;
    assert.ok(newMtime > oldMtime,
      `mtime should be refreshed: old=${oldMtime} new=${newMtime}`);
  })) passed++; else failed++;

  if (test('active session survives prune after being read', () => {
    cleanSessionDir();
    const sessionId = 'active-but-old';
    const hours71 = 71 * 60 * 60 * 1000;
    createSessionFile(sessionId + '.json', { model: 'opus' }, hours71);

    // Simulate a hook reading the session (touches mtime)
    telemetry.readSessionModel(sessionId);

    // Now prune — file should survive because mtime was just refreshed
    telemetry.pruneStaleSessionFiles();

    assert.strictEqual(fs.existsSync(path.join(SESSION_DIR, sessionId + '.json')), true,
      'recently-read session should survive prune');
  })) passed++; else failed++;

  if (test('old unread session is pruned even if another session is active', () => {
    cleanSessionDir();
    const hours73 = 73 * 60 * 60 * 1000;
    createSessionFile('stale.json', { model: 'old' }, hours73);
    createSessionFile('active.json', { model: 'new' }, 0);

    // Read only the active one
    telemetry.readSessionModel('active');

    telemetry.pruneStaleSessionFiles();

    assert.strictEqual(fs.existsSync(path.join(SESSION_DIR, 'stale.json')), false,
      'stale session should be pruned');
    assert.strictEqual(fs.existsSync(path.join(SESSION_DIR, 'active.json')), true,
      'active session should survive');
  })) passed++; else failed++;

  // ── persistSessionModel keeps file fresh ───────────────────────────

  console.log('\npersistSessionModel freshness:');

  if (test('persisting model resets mtime making file safe from prune', () => {
    cleanSessionDir();
    const sessionId = 'persist-fresh-test';
    const hours73 = 73 * 60 * 60 * 1000;
    createSessionFile(sessionId + '.json', { model: 'old-model' }, hours73);

    // Re-persist model (simulates a new SessionStart reusing same session_id)
    telemetry.persistSessionModel(sessionId, 'new-model');

    telemetry.pruneStaleSessionFiles();

    assert.strictEqual(fs.existsSync(path.join(SESSION_DIR, sessionId + '.json')), true,
      'freshly written file should survive prune');
    const model = telemetry.readSessionModel(sessionId);
    assert.strictEqual(model, 'new-model');
  })) passed++; else failed++;

  // ── Cleanup ────────────────────────────────────────────────────────

  process.env.HOME = origHome;
  process.env.USERPROFILE = origUserProfile;
  try { fs.rmSync(tmpHome, { recursive: true }); } catch { /* ignore */ }

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
