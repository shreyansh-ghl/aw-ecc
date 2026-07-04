'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  firstSentenceOrClamp,
  classifyInvocation,
  lintInvocation,
  trimSkillContent,
} = require('./skill-invocation');

// --- firstSentenceOrClamp (P2 trim primitive) ---

test('firstSentenceOrClamp returns first sentence when short', () => {
  assert.strictEqual(
    firstSentenceOrClamp('Do the thing. Then more detail that we drop.'),
    'Do the thing.'
  );
});

test('firstSentenceOrClamp clamps a long first sentence on a word boundary', () => {
  const long = 'A'.repeat(60) + ' ' + 'B'.repeat(60) + ' tail';
  const out = firstSentenceOrClamp(long, 100);
  assert.ok(out.length <= 100);
  assert.ok(!out.endsWith(' '));
});

test('firstSentenceOrClamp never returns empty for non-empty input', () => {
  assert.ok(firstSentenceOrClamp('word').length > 0);
});

// --- classifyInvocation (default slash) ---

test('classifyInvocation defaults to slash when field absent', () => {
  assert.strictEqual(classifyInvocation({}), 'slash');
});

test('classifyInvocation honors explicit auto', () => {
  assert.strictEqual(classifyInvocation({ invocation: 'auto' }), 'auto');
});

// --- lintInvocation (P1) ---

test('lint errors when auto contradicts an Internal only trigger', () => {
  const r = lintInvocation({
    invocation: 'auto',
    trigger: 'Internal only. Invoked by aw-plan.',
  });
  assert.ok(r.errors.length >= 1);
});

test('lint warns when slash skill has natural-language intent and no command', () => {
  const r = lintInvocation({
    invocation: 'slash',
    trigger: 'when the user asks to summarize a document',
  });
  assert.ok(r.warnings.length >= 1);
});

test('lint passes a clean auto skill', () => {
  const r = lintInvocation({
    invocation: 'auto',
    trigger: 'when the user asks to create a PR video',
  });
  assert.strictEqual(r.errors.length, 0);
});

test('lint allows auto when trigger is internal AND direct user intent (mixed)', () => {
  const r = lintInvocation({
    invocation: 'auto',
    trigger:
      'Invoked by aw-investigate or aw-debug when the cause stays uncertain, or directly when a user wants a disciplined diagnosis of a stubborn bug.',
  });
  assert.strictEqual(r.errors.length, 0);
});

// --- trimSkillContent (P2 applied to a real SKILL.md string) ---

const AUTO_MD = `---
name: demo-auto
invocation: auto
description: Fire on natural language. Extra sentence that must be kept.
trigger: when the user asks for a demo
---

# body
`;

const SLASH_MD = `---
name: demo-slash
invocation: slash
description: Reached by a command. This long tail should be dropped from the list.
trigger: User runs /demo
---

# body
`;

test('trimSkillContent leaves auto description untouched', () => {
  const r = trimSkillContent(AUTO_MD);
  assert.strictEqual(r.invocation, 'auto');
  assert.strictEqual(r.changed, false);
  assert.ok(r.content.includes('Extra sentence that must be kept.'));
});

test('trimSkillContent trims slash description to one line, keeps rest intact', () => {
  const r = trimSkillContent(SLASH_MD);
  assert.strictEqual(r.invocation, 'slash');
  assert.strictEqual(r.changed, true);
  assert.ok(r.after < r.before);
  assert.ok(r.content.includes('description: Reached by a command.'));
  assert.ok(!r.content.includes('should be dropped'));
  // structure preserved
  assert.ok(r.content.includes('name: demo-slash'));
  assert.ok(r.content.includes('trigger: User runs /demo'));
  assert.ok(r.content.includes('# body'));
});

test('trimSkillContent never empties a description', () => {
  const r = trimSkillContent(SLASH_MD);
  const line = r.content.split('\n').find(l => l.startsWith('description:'));
  assert.ok(line.replace('description:', '').trim().length > 0);
});
