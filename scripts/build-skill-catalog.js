#!/usr/bin/env node
'use strict';

/**
 * Build a trimmed skill catalog.
 *
 * Reads every <dir>/SKILL.md under a skills root, applies the invocation trim
 * (auto keeps full description, slash gets a one-line floor), and reports the
 * standing-list token cost before vs after. Optionally writes trimmed SKILL.md
 * files to an output dir so the harness enumerates the slim versions.
 *
 * Usage:
 *   node scripts/build-skill-catalog.js --skills <dir> [--out <dir>] [--json] [--show <n>]
 */

const fs = require('fs');
const path = require('path');
const {
  classifyInvocation,
  lintInvocation,
  trimSkillContent,
  splitFrontmatter,
} = require('./lib/skill-invocation');

function parseArgs(argv) {
  const args = { skills: null, out: null, json: false, show: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skills') args.skills = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--show') args.show = Number(argv[++i]) || 0;
  }
  return args;
}

const estTokens = bytes => Math.round(bytes / 4);

function listSkillDirs(root) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory() && fs.existsSync(path.join(root, e.name, 'SKILL.md')))
    .map(e => e.name)
    .sort();
}

function build(root, options = {}) {
  const dirs = listSkillDirs(root);
  const entries = [];
  let beforeBytes = 0;
  let afterBytes = 0;
  let autoCount = 0;
  let slashCount = 0;
  let trimmedCount = 0;
  const lintErrors = [];
  const lintWarnings = [];

  for (const dir of dirs) {
    const file = path.join(root, dir, 'SKILL.md');
    const content = fs.readFileSync(file, 'utf-8');
    const parsed = splitFrontmatter(content);
    const fm = parsed ? parsed.fm : {};
    const invocation = classifyInvocation(fm);
    const lint = lintInvocation(fm);
    const trim = trimSkillContent(content);

    if (invocation === 'auto') autoCount++;
    else slashCount++;
    if (trim.changed) trimmedCount++;

    // Standing-list description = full for auto, trimmed for slash.
    const listBefore = (fm.description || '').length;
    const listAfter = invocation === 'auto' ? listBefore : trim.after;
    beforeBytes += listBefore;
    afterBytes += listAfter;

    lint.errors.forEach(m => lintErrors.push(`${dir}: ${m}`));
    lint.warnings.forEach(m => lintWarnings.push(`${dir}: ${m}`));

    entries.push({
      name: fm.name || dir,
      invocation,
      before: listBefore,
      after: listAfter,
      trimmedDescription: invocation === 'auto' ? fm.description : listBefore === listAfter ? fm.description : trimSkillContent(content).content
        .split('\n')
        .find(l => l.startsWith('description:'))
        .replace('description:', '')
        .trim(),
    });

    if (options.out && trim.changed) {
      const destDir = path.join(options.out, dir);
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(path.join(destDir, 'SKILL.md'), trim.content);
    }
  }

  return {
    root,
    skillCount: dirs.length,
    autoCount,
    slashCount,
    trimmedCount,
    beforeBytes,
    afterBytes,
    savedBytes: beforeBytes - afterBytes,
    savedTokens: estTokens(beforeBytes) - estTokens(afterBytes),
    lintErrors,
    lintWarnings,
    entries,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.skills) {
    console.error('Usage: node scripts/build-skill-catalog.js --skills <dir> [--out <dir>] [--json] [--show <n>]');
    process.exit(2);
  }
  const result = build(args.skills, { out: args.out });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Skill catalog trim — ${result.root}`);
  console.log(`  skills: ${result.skillCount}  (auto: ${result.autoCount}, slash: ${result.slashCount})`);
  console.log(`  standing-list description bytes: ${result.beforeBytes} -> ${result.afterBytes}`);
  console.log(`  saved: ${result.savedBytes} B  (~${result.savedTokens} tokens)  across ${result.trimmedCount} trimmed`);
  if (result.lintErrors.length) {
    console.log(`  LINT ERRORS (${result.lintErrors.length}):`);
    result.lintErrors.forEach(m => console.log(`    - ${m}`));
  } else {
    console.log('  lint errors: 0');
  }
  console.log(`  lint warnings: ${result.lintWarnings.length}`);
  if (args.show) {
    console.log(`\n  sample trims (largest ${args.show}):`);
    result.entries
      .filter(e => e.invocation === 'slash' && e.before !== e.after)
      .sort((a, b) => b.before - b.after - (a.before - a.after))
      .slice(0, args.show)
      .forEach(e => console.log(`    ${e.name}  ${e.before}B -> ${e.after}B`));
  }
  if (args.out) console.log(`\n  wrote trimmed SKILL.md for ${result.trimmedCount} slash skills -> ${args.out}`);

  if (result.lintErrors.length) process.exit(1);
}

if (require.main === module) main();

module.exports = { build };
