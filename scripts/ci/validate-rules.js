#!/usr/bin/env node
/**
 * Validate rule markdown files
 */

const fs = require('fs');
const path = require('path');

const RULES_DIR = path.join(__dirname, '../../rules');

/**
 * Recursively collect markdown rule files.
 * Uses explicit traversal for portability across Node versions.
 * @param {string} dir - Directory to scan
 * @returns {string[]} Relative file paths from RULES_DIR
 */
function collectRuleFiles(dir) {
  const files = [];

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectRuleFiles(absolute));
      continue;
    }

    if (entry.name.endsWith('.md')) {
      files.push(path.relative(RULES_DIR, absolute));
    }

    // Non-markdown files are ignored.
  }

  return files;
}

/**
 * Validate that .mdc files (Cursor rule format) have frontmatter at byte 0.
 * Anything before the opening `---` — including HTML comments — makes Cursor
 * treat the file as having no frontmatter, silently breaking alwaysApply/globs.
 */
function validateCursorMdcFrontmatter() {
  const repoRoot = path.join(__dirname, '../..');
  const errors = [];

  function scan(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(abs);
        continue;
      }
      if (!entry.name.endsWith('.mdc')) continue;
      const content = fs.readFileSync(abs, 'utf-8');
      if (!content.startsWith('---')) {
        const firstLine = content.split('\n', 1)[0].slice(0, 80);
        errors.push(`${path.relative(repoRoot, abs)}: frontmatter must be at byte 0 (first line is: ${firstLine})`);
      }
    }
  }

  scan(repoRoot);

  if (errors.length > 0) {
    console.error('ERROR: .mdc files with content before frontmatter (breaks Cursor alwaysApply/globs):');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    return false;
  }
  return true;
}

function validateRules() {
  if (!fs.existsSync(RULES_DIR)) {
    console.log('No rules directory found, skipping validation');
    process.exit(0);
  }

  const files = collectRuleFiles(RULES_DIR);
  let hasErrors = false;
  let validatedCount = 0;

  for (const file of files) {
    const filePath = path.join(RULES_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.trim().length === 0) {
        console.error(`ERROR: ${file} - Empty rule file`);
        hasErrors = true;
        continue;
      }
      validatedCount++;
    } catch (err) {
      console.error(`ERROR: ${file} - ${err.message}`);
      hasErrors = true;
    }
  }

  if (!validateCursorMdcFrontmatter()) {
    hasErrors = true;
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log(`Validated ${validatedCount} rule files`);
}

validateRules();
