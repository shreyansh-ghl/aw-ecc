const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

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

function read(file) {
  return snapshot.readFile(file);
}

function assertIncludes(file, needle) {
  assert.ok(read(file).includes(needle), `${file} missing ${needle}`);
}

function assertNotIncludes(file, needle) {
  assert.ok(!read(file).includes(needle), `${file} must not include ${needle}`);
}

function exactWorktreeChildExists(dir, child) {
  if (!snapshot.isWorktree()) {
    return snapshot.fileExists(`${dir}/${child}`);
  }
  return fs.readdirSync(path.join(REPO_ROOT, dir)).includes(child);
}

function run() {
  console.log(`\n=== AW Cross-Cutting Skill Wiring (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('ported skills exist with lowercase support filenames', () => {
    for (const file of [
      'skills/diagnose/SKILL.md',
      'skills/grill-me/SKILL.md',
      'skills/grill-with-docs/SKILL.md',
      'skills/grill-with-docs/context-format.md',
      'skills/grill-with-docs/adr-format.md',
      'skills/improve-codebase-architecture/SKILL.md',
      'skills/improve-codebase-architecture/deepening.md',
      'skills/improve-codebase-architecture/interface-design.md',
      'skills/improve-codebase-architecture/language.md',
      'skills/tdd/SKILL.md',
      'skills/to-issues/SKILL.md',
      'skills/to-prd/SKILL.md',
      'skills/zoom-out/SKILL.md',
    ]) {
      assert.ok(snapshot.fileExists(file), `${file} missing`);
    }

    for (const file of ['ADR-FORMAT.md', 'CONTEXT-FORMAT.md']) {
      assert.ok(!exactWorktreeChildExists('skills/grill-with-docs', file), `skills/grill-with-docs/${file} must not exist`);
    }
    for (const file of ['LANGUAGE.md', 'INTERFACE-DESIGN.md', 'DEEPENING.md']) {
      assert.ok(!exactWorktreeChildExists('skills/improve-codebase-architecture', file), `skills/improve-codebase-architecture/${file} must not exist`);
    }
  })) passed++; else failed++;

  if (test('commands and stage skills wire the same cross-cutting behavior', () => {
    for (const file of ['commands/plan.md', 'skills/aw-plan/SKILL.md']) {
      assertIncludes(file, 'grill-with-docs');
      assertIncludes(file, 'to-prd');
      assertIncludes(file, 'to-issues');
      assertIncludes(file, 'do not require');
      assertIncludes(file, 'Decision Confidence Gate');
    }
    assertIncludes('commands/plan.md', 'Always invoke `grill-with-docs`');
    assertNotIncludes('commands/plan.md', 'Use `clear` only');
    assertNotIncludes('commands/plan.md', 'Use `confirm` when');
    assertNotIncludes('commands/plan.md', 'Use `grill` for the full');
    assertIncludes('skills/aw-plan/SKILL.md', 'If `grill-with-docs` returns `clear`');
    assertIncludes('skills/aw-plan/SKILL.md', 'If it returns `confirm`');
    assertIncludes('skills/aw-plan/SKILL.md', 'If it returns `grill`');

    for (const file of ['commands/build.md', 'skills/aw-build/SKILL.md']) {
      assertIncludes(file, 'tdd-workflow');
      assertIncludes(file, '`tdd`');
      assertIncludes(file, 'RED-GREEN');
    }

    for (const file of ['commands/investigate.md', 'skills/aw-investigate/SKILL.md']) {
      assertIncludes(file, 'diagnose');
      assertIncludes(file, 'unclear');
    }
  })) passed++; else failed++;

  if (test('grill-with-docs keeps planning context feature-scoped with an HTML companion', () => {
    const grillWithDocs = read('skills/grill-with-docs/SKILL.md');
    for (const phrase of [
      '.aw_docs/features/<feature_slug>/context.md',
      '.aw_docs/features/<feature_slug>/context.html',
      'write planning-specific language to the active feature folder first',
      'Treat root or bounded-context `CONTEXT.md` as a promotion target',
      'After the grill is complete',
      'Invoking `/aw:plan` in default `dual` mode is already explicit authorization',
      'keep `context.md` canonical for agents',
    ]) {
      assert.ok(grillWithDocs.includes(phrase), `grill-with-docs is missing ${phrase}`);
    }

    const contextFormat = read('skills/grill-with-docs/context-format.md');
    assert.ok(contextFormat.includes('During AW planning, feature `context.md` is the default write target'));
    assert.ok(contextFormat.includes('.aw_docs/features/<feature_slug>/context.html'));
  })) passed++; else failed++;

  if (test('router advertises cross-cutting skills without making them blanket mandates', () => {
    const router = read('skills/using-aw-skills/SKILL.md');
    for (const skill of [
      'grill-with-docs',
      'to-prd',
      'to-issues',
      'tdd',
      'diagnose',
      'zoom-out',
      'improve-codebase-architecture',
      'grill-me',
    ]) {
      assert.ok(router.includes(`| \`${skill}\``), `router missing ${skill}`);
    }
    assert.ok(router.includes('Decision Confidence Gate'));
    assert.ok(router.includes('mostly-clear plans ask one confirmation question'));
    assert.ok(router.includes('Inside every `/aw:plan` as the Decision Confidence Gate'));
    assert.ok(router.includes('do not require it for already-clear technical plans'));
    assert.ok(router.includes('remote issue publishing requires an explicit user request'));
  })) passed++; else failed++;

  if (test('ported skills avoid misleading external workflow assumptions', () => {
    for (const file of [
      'commands/plan.md',
      'skills/aw-plan/SKILL.md',
      'skills/to-prd/SKILL.md',
      'skills/to-issues/SKILL.md',
    ]) {
      assertNotIncludes(file, 'Do not skip this step even in technical mode');
      assertNotIncludes(file, 'must exist before any other artifact');
      assertNotIncludes(file, '/setup-matt-pocock-skills');
    }
    assertIncludes('skills/to-issues/SKILL.md', 'Publish remote issues only when the user explicitly asks');
    assertIncludes('skills/to-prd/SKILL.md', 'does not publish anything remotely unless the user explicitly asks');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
