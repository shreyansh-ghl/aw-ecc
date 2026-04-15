#!/usr/bin/env node
/**
 * PostToolUse Hook: AW Skill Output Shape Validator
 *
 * Fires after any Skill tool call. Checks that /aw:plan and /aw:build
 * outputs contain the required shape fields for clean stage handoff.
 *
 * Required fields per skill:
 *   /aw:build  → Mode, Approved Inputs, Phase Progress
 *   /aw:plan   → Mode, Created, Phases
 *   /aw:test   → Mode, Scope, Evidence
 *   /aw:review → Mode, Findings, Verdict
 *
 * Always exits 0 (warning only — never blocks).
 */

'use strict';

const REQUIRED_FIELDS = {
  'aw:build': ['Mode', 'Approved Inputs', 'Phase Progress'],
  'build':    ['Mode', 'Approved Inputs', 'Phase Progress'],
  'aw:plan':  ['Mode', 'Created', 'Phases'],
  'plan':     ['Mode', 'Created', 'Phases'],
  'aw:test':  ['Mode', 'Scope', 'Evidence'],
  'test':     ['Mode', 'Scope', 'Evidence'],
  'aw:review': ['Mode', 'Findings', 'Verdict'],
  'review':   ['Mode', 'Findings', 'Verdict'],
};

const MAX_STDIN = 1024 * 1024;

function readStdin() {
  return new Promise(resolve => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (raw.length < MAX_STDIN) raw += chunk.substring(0, MAX_STDIN - raw.length);
    });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', () => resolve(raw));
  });
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }

  if (data.tool_name !== 'Skill') return;

  const skillName = (data.tool_input?.skill || '').trim();
  if (!skillName) return;

  // Catch unnecessary reload of using-aw-skills (already loaded at session start)
  if (skillName === 'using-aw-skills') {
    console.log('[AW Cache] using-aw-skills was re-invoked — this is a no-op. It is already loaded from session start.');
    console.log('  Apply its routing rules from context. Do not call Skill("using-aw-skills") again this session.');
    return;
  }

  const required = REQUIRED_FIELDS[skillName];
  if (!required) return;

  const responseText = (() => {
    const r = data.tool_response;
    if (!r) return '';
    if (typeof r === 'string') return r;
    return JSON.stringify(r);
  })();

  const responseLower = responseText.toLowerCase();
  const missing = required.filter(f => !responseLower.includes(f.toLowerCase()));

  if (missing.length > 0) {
    console.log(`[AW Shape Validator] /${skillName} output missing required fields: ${missing.join(', ')}`);
    console.log(`  Expected shape: ${required.join(', ')}`);
    console.log(`  See ~/.aw-ecc/references/route-selection-patterns.md for output shape spec.`);
  }
}

main().catch(() => {}).finally(() => process.exit(0));
