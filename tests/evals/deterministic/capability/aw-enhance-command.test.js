const assert = require('assert');
const path = require('path');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');
const { parseFrontmatter } = require('../../lib/markdown-frontmatter');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const COMMAND_PATH = 'commands/enhance.md';
const SKILL_PATH = 'skills/aw-enhance/SKILL.md';

const EXPECTED_PHASES = [
  'Phase 1',  'Phase 2',  'Phase 3',  'Phase 4',  'Phase 5',
  'Phase 6',  'Phase 7',  'Phase 8',  'Phase 9',  'Phase 10',
  'Phase 11', 'Phase 12', 'Phase 13', 'Phase 14', 'Phase 15', 'Phase 16',
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
  'platform-infra-production-readiness',
  'security-reviewer',
  'build-error-resolver',
];

const WARN_ON_SKIP_PHASES = ['Phase 8', 'Phase 9', 'Phase 15', 'Phase 16'];

const ENHANCEMENT_SPECIFIC_CONCEPTS = [
  'delta',
  'Current Behavior',
  'Proposed Changes',
  'regression',
  'existing tests',
];

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
  console.log(`\n=== AW Enhance Command (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  // --- Command file tests ---

  if (test('command file exists', () => {
    assert.ok(snapshot.fileExists(COMMAND_PATH), `Missing ${COMMAND_PATH}`);
  })) passed++; else failed++;

  if (test('command frontmatter has required fields', () => {
    const fm = parseFrontmatter(snapshot.readFile(COMMAND_PATH));
    assert.strictEqual(fm.name, 'aw:enhance', 'name should be aw:enhance');
    assert.strictEqual(fm.status, 'active', 'status should be active');
    assert.strictEqual(fm.stage, 'enhance', 'stage should be enhance');
    assert.strictEqual(fm.internal_skill, 'aw-enhance', 'internal_skill should be aw-enhance');
    assert.ok(fm.description, 'description should not be empty');
    assert.ok(fm['argument-hint'], 'argument-hint should not be empty');
  })) passed++; else failed++;

  if (test('command lists all 16 phases', () => {
    const content = snapshot.readFile(COMMAND_PATH);
    for (let i = 1; i <= 16; i++) {
      assert.ok(
        content.includes(`| ${i} |`),
        `Command should list phase ${i} in the phases table`
      );
    }
  })) passed++; else failed++;

  // --- Backing skill tests ---

  if (test('aw-enhance skill file exists', () => {
    assert.ok(snapshot.fileExists(SKILL_PATH), `Missing ${SKILL_PATH}`);
  })) passed++; else failed++;

  if (test('skill frontmatter is correct', () => {
    const fm = parseFrontmatter(snapshot.readFile(SKILL_PATH));
    assert.strictEqual(fm.name, 'aw-enhance', 'name should be aw-enhance');
    assert.ok(fm.description, 'description should not be empty');
    assert.ok(fm.trigger, 'trigger should not be empty');
  })) passed++; else failed++;

  if (test('skill defines all 16 phases', () => {
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

  // --- Enhancement-specific tests ---

  if (test('skill has enhancement-specific concepts (delta PRD, regression, current state)', () => {
    const content = snapshot.readFile(SKILL_PATH);
    for (const concept of ENHANCEMENT_SPECIFIC_CONCEPTS) {
      assert.ok(
        content.includes(concept),
        `Skill should include enhancement concept "${concept}"`
      );
    }
  })) passed++; else failed++;

  if (test('Phase 2 explores existing code before asking requirements', () => {
    const content = snapshot.readFile(SKILL_PATH);
    const phase2Idx = content.indexOf('### Phase 2:');
    const phase3Idx = content.indexOf('### Phase 3:');
    const phase2Content = content.substring(phase2Idx, phase3Idx);
    assert.ok(phase2Content.includes('Read'), 'Phase 2 should use Read tool');
    assert.ok(phase2Content.includes('Grep') || phase2Content.includes('Glob'), 'Phase 2 should use search tools');
    assert.ok(phase2Content.includes('existing'), 'Phase 2 should focus on existing code');
  })) passed++; else failed++;

  if (test('Phase 9 is regression-first (existing tests before new tests)', () => {
    const content = snapshot.readFile(SKILL_PATH);
    const phase9Idx = content.indexOf('### Phase 9:');
    const phase10Idx = content.indexOf('### Phase 10:');
    const phase9Content = content.substring(phase9Idx, phase10Idx);
    assert.ok(phase9Content.includes('existing tests first'), 'Phase 9 should run existing tests first');
    assert.ok(phase9Content.includes('regression'), 'Phase 9 should mention regression');
  })) passed++; else failed++;

  if (test('skill reuses aw-repo-setup (no duplication)', () => {
    const content = snapshot.readFile(SKILL_PATH);
    assert.ok(content.includes('aw-repo-setup'), 'Phase 1 should delegate to aw-repo-setup');
    assert.ok(!content.includes('## Step 1: Get the Screenshot'), 'Should not duplicate repo setup steps');
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

  if (test('progress bar uses /16 not /15', () => {
    const content = snapshot.readFile(SKILL_PATH);
    assert.ok(content.includes('N/16'), 'Progress bar should show N/16');
    assert.ok(content.includes('16/16'), 'Completion should show 16/16');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
