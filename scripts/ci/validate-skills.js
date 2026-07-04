#!/usr/bin/env node
/**
 * Validate curated skill directories (skills/ in repo).
 * Scope: curated only. Learned/imported/evolved roots are out of scope.
 * If skills/ does not exist, exit 0 (no curated skills to validate).
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '../../skills');

// Self-contained invocation-marker check. Kept inline (no require) because this
// validator is executed as a standalone temp file by the CI test harness, so a
// sibling `require('../lib/...')` would not resolve. The richer lint (warnings,
// under-marking) lives in scripts/lib/skill-invocation.js for the catalog
// runner and unit tests; only the fatal contradiction is enforced here.
function readInvocationError(content) {
  const match = String(content).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
  }
  const invocation = String(fm.invocation || '').trim().toLowerCase();
  if (invocation !== 'auto') return null;
  const trigger = String(fm.trigger || '');
  const internalAbsolute = /internal only/i.test(trigger);
  const directIntent = /directly when|or when (?:a |the )?user|user wants|user asks/i.test(trigger);
  const internalWithoutEscape =
    internalAbsolute || (/invoked by\b/i.test(trigger) && !directIntent);
  if (internalWithoutEscape) {
    return 'invocation:auto contradicts an internal/parent-called trigger — internal skills must be slash';
  }
  return null;
}

function validateSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('No curated skills directory (skills/), skipping');
    process.exit(0);
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  let hasErrors = false;
  let validCount = 0;

  for (const dir of dirs) {
    const skillMd = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      console.error(`ERROR: ${dir}/ - Missing SKILL.md`);
      hasErrors = true;
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(skillMd, 'utf-8');
    } catch (err) {
      console.error(`ERROR: ${dir}/SKILL.md - ${err.message}`);
      hasErrors = true;
      continue;
    }
    if (content.trim().length === 0) {
      console.error(`ERROR: ${dir}/SKILL.md - Empty file`);
      hasErrors = true;
      continue;
    }

    const invocationError = readInvocationError(content);
    if (invocationError) {
      console.error(`ERROR: ${dir}/SKILL.md - ${invocationError}`);
      hasErrors = true;
      continue;
    }

    validCount++;
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log(`Validated ${validCount} skill directories`);
}

validateSkills();
