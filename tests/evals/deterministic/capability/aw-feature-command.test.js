const assert = require('assert');
const path = require('path');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');
const { parseFrontmatter } = require('../../lib/markdown-frontmatter');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const COMMAND_PATH = 'commands/feature.md';
const SKILL_PATH = 'skills/aw-feature/SKILL.md';
const REPO_SETUP_SKILL_PATH = 'skills/aw-repo-setup/SKILL.md';

const EXPECTED_PHASES = [
  'Phase 1',  'Phase 2',  'Phase 3',  'Phase 4',  'Phase 5',
  'Phase 6',  'Phase 7',  'Phase 8',  'Phase 9',  'Phase 10',
  'Phase 11', 'Phase 12', 'Phase 13', 'Phase 14', 'Phase 15',
];

const DELEGATION_TARGETS = [
  'aw-repo-setup',
  'aw-plan',
  'aw-brainstorm',
  'aw-build',
  'aw-review',
  'aw-test',
  'aw-investigate',
  'aw-deploy',
  'aw-ship',
];

const WARN_ON_SKIP_PHASES = ['Phase 7', 'Phase 8', 'Phase 14', 'Phase 15'];

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS ${name}`);
    return true;
  } catch (error) {
    console.log(`  FAIL ${name}`);
    console.log(`    ${error.message}`);
    return false;
  }
}

function run() {
  console.log(`\n=== AW Feature Command (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  // --- Command file tests ---

  if (test('command file exists', () => {
    assert.ok(snapshot.fileExists(COMMAND_PATH), `Missing ${COMMAND_PATH}`);
  })) passed++; else failed++;

  if (test('command frontmatter has required fields', () => {
    const fm = parseFrontmatter(snapshot.readFile(COMMAND_PATH));
    assert.strictEqual(fm.name, 'aw:feature', 'name should be aw:feature');
    assert.strictEqual(fm.status, 'active', 'status should be active');
    assert.strictEqual(fm.stage, 'feature', 'stage should be feature');
    assert.strictEqual(fm.internal_skill, 'aw-feature', 'internal_skill should be aw-feature');
    assert.ok(fm.description, 'description should not be empty');
    assert.ok(fm['argument-hint'], 'argument-hint should not be empty');
  })) passed++; else failed++;

  if (test('command lists all 15 phases', () => {
    const content = snapshot.readFile(COMMAND_PATH);
    for (let i = 1; i <= 15; i++) {
      assert.ok(
        content.includes(`| ${i} |`),
        `Command should list phase ${i} in the phases table`
      );
    }
  })) passed++; else failed++;

  // --- Backing skill tests ---

  if (test('aw-feature skill file exists', () => {
    assert.ok(snapshot.fileExists(SKILL_PATH), `Missing ${SKILL_PATH}`);
  })) passed++; else failed++;

  if (test('skill frontmatter is correct', () => {
    const fm = parseFrontmatter(snapshot.readFile(SKILL_PATH));
    assert.strictEqual(fm.name, 'aw-feature', 'name should be aw-feature');
    assert.ok(fm.description, 'description should not be empty');
    assert.ok(fm.trigger, 'trigger should not be empty');
  })) passed++; else failed++;

  if (test('skill defines all 15 phases', () => {
    const content = snapshot.readFile(SKILL_PATH);
    for (const phase of EXPECTED_PHASES) {
      assert.ok(
        content.includes(`### ${phase}:`),
        `Skill should define "${phase}:" as a section heading`
      );
    }
  })) passed++; else failed++;

  if (test('skill references all expected delegation targets', () => {
    const content = snapshot.readFile(SKILL_PATH);
    for (const target of DELEGATION_TARGETS) {
      assert.ok(
        content.includes(target),
        `Skill should reference delegation target "${target}"`
      );
    }
  })) passed++; else failed++;

  if (test('skill defines state.json schema', () => {
    const content = snapshot.readFile(SKILL_PATH);
    assert.ok(content.includes('"feature"'), 'state schema should have "feature" field');
    assert.ok(content.includes('"phase"'), 'state schema should have "phase" field');
    assert.ok(content.includes('"completed"'), 'state schema should have "completed" field');
    assert.ok(content.includes('"skipped"'), 'state schema should have "skipped" field');
    assert.ok(content.includes('"status"'), 'state schema should have "status" field');
  })) passed++; else failed++;

  if (test('skill defines skip rules with correct warn phases', () => {
    const content = snapshot.readFile(SKILL_PATH);
    assert.ok(content.includes('Every phase is skippable'), 'Should declare all phases skippable');
    for (const phase of WARN_ON_SKIP_PHASES) {
      const phaseNum = phase.replace('Phase ', '');
      assert.ok(
        content.includes(`Phase ${phaseNum}`),
        `Should mention ${phase} in skip warning section`
      );
    }
  })) passed++; else failed++;

  if (test('skill defines navigation commands', () => {
    const content = snapshot.readFile(SKILL_PATH);
    const navCommands = ['skip', 'skip to phase', 'go to phase', 'show progress', 'where am I'];
    for (const cmd of navCommands) {
      assert.ok(
        content.toLowerCase().includes(cmd.toLowerCase()),
        `Skill should support navigation command "${cmd}"`
      );
    }
  })) passed++; else failed++;

  if (test('skill defines cross-harness compatibility', () => {
    const content = snapshot.readFile(SKILL_PATH);
    assert.ok(content.includes('Cursor'), 'Should mention Cursor compatibility');
    assert.ok(content.includes('Claude Code'), 'Should mention Claude Code compatibility');
    assert.ok(content.includes('Codex'), 'Should mention Codex compatibility');
    assert.ok(content.includes('state.json'), 'Should use state.json for progress');
  })) passed++; else failed++;

  if (test('skill has no placeholders', () => {
    const content = snapshot.readFile(SKILL_PATH);
    assert.ok(!content.includes('TODO'), 'Should have no TODO placeholders');
    assert.ok(!content.includes('TBD'), 'Should have no TBD placeholders');
    assert.ok(!content.includes('implement later'), 'Should have no "implement later" placeholders');
  })) passed++; else failed++;

  // --- Repo setup skill tests ---

  if (test('aw-repo-setup skill file exists', () => {
    assert.ok(snapshot.fileExists(REPO_SETUP_SKILL_PATH), `Missing ${REPO_SETUP_SKILL_PATH}`);
  })) passed++; else failed++;

  if (test('aw-repo-setup frontmatter is correct', () => {
    const fm = parseFrontmatter(snapshot.readFile(REPO_SETUP_SKILL_PATH));
    assert.strictEqual(fm.name, 'aw-repo-setup', 'name should be aw-repo-setup');
    assert.ok(fm.description, 'description should not be empty');
    assert.ok(fm.trigger, 'trigger should not be empty');
  })) passed++; else failed++;

  if (test('aw-repo-setup covers the 8-step setup flow', () => {
    const content = snapshot.readFile(REPO_SETUP_SKILL_PATH);
    for (let i = 1; i <= 8; i++) {
      assert.ok(
        content.includes(`## Step ${i}`),
        `Should define Step ${i} in the setup flow`
      );
    }
  })) passed++; else failed++;

  // --- Cross-file consistency ---

  if (test('command internal_skill matches skill name', () => {
    const cmdFm = parseFrontmatter(snapshot.readFile(COMMAND_PATH));
    const skillFm = parseFrontmatter(snapshot.readFile(SKILL_PATH));
    assert.strictEqual(
      cmdFm.internal_skill,
      skillFm.name,
      `Command internal_skill (${cmdFm.internal_skill}) should match skill name (${skillFm.name})`
    );
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
