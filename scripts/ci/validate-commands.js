#!/usr/bin/env node
/**
 * Validate command markdown files are non-empty, readable,
 * and have valid cross-references to other commands, agents, and skills.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const COMMANDS_DIR = path.join(ROOT_DIR, 'commands');
const AGENTS_DIR = path.join(ROOT_DIR, 'agents');
const SKILLS_DIR = path.join(ROOT_DIR, 'skills');
const VALID_COMMAND_STATUS = new Set(['active', 'alias', 'deprecated']);
const VALID_FORWARD_MODES = new Set(['silent', 'warn', 'stop']);

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseCommandFrontmatter(content) {
  if (typeof content !== 'string' || !content.startsWith('---\n')) {
    return { attributes: {}, hasFrontmatter: false };
  }

  const closingIndex = content.indexOf('\n---\n', 4);
  if (closingIndex === -1) {
    return { attributes: {}, hasFrontmatter: false };
  }

  const rawFrontmatter = content.slice(4, closingIndex);
  const attributes = {};

  for (const line of rawFrontmatter.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());
    attributes[key] = value;
  }

  return { attributes, hasFrontmatter: true };
}

function validateCommands() {
  if (!fs.existsSync(COMMANDS_DIR)) {
    console.log('No commands directory found, skipping validation');
    process.exit(0);
  }

  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'));
  let hasErrors = false;
  let warnCount = 0;

  // Build set of valid command names (without .md extension)
  const validCommands = new Set(files.map(f => f.replace(/\.md$/, '')));

  // Build set of valid agent names (without .md extension)
  const validAgents = new Set();
  if (fs.existsSync(AGENTS_DIR)) {
    for (const f of fs.readdirSync(AGENTS_DIR)) {
      if (f.endsWith('.md')) {
        validAgents.add(f.replace(/\.md$/, ''));
      }
    }
  }

  // Build set of valid skill directory names
  const validSkills = new Set();
  if (fs.existsSync(SKILLS_DIR)) {
    for (const f of fs.readdirSync(SKILLS_DIR)) {
      const skillPath = path.join(SKILLS_DIR, f);
      try {
        if (fs.statSync(skillPath).isDirectory()) {
          validSkills.add(f);
        }
      } catch {
        // skip unreadable entries
      }
    }
  }

  for (const file of files) {
    const filePath = path.join(COMMANDS_DIR, file);
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.error(`ERROR: ${file} - ${err.message}`);
      hasErrors = true;
      continue;
    }

    // Validate the file is non-empty readable markdown
    if (content.trim().length === 0) {
      console.error(`ERROR: ${file} - Empty command file`);
      hasErrors = true;
      continue;
    }

    const { attributes } = parseCommandFrontmatter(content);
    const status = attributes.status;
    const replacement = attributes.replacement;
    const forwardMode = attributes.forwardMode;

    if (status && !VALID_COMMAND_STATUS.has(status)) {
      console.error(`ERROR: ${file} - invalid status "${status}" (expected active|alias|deprecated)`);
      hasErrors = true;
    }

    if (forwardMode && !VALID_FORWARD_MODES.has(forwardMode)) {
      console.error(`ERROR: ${file} - invalid forwardMode "${forwardMode}" (expected silent|warn|stop)`);
      hasErrors = true;
    }

    if ((status === 'alias' || status === 'deprecated') && !replacement) {
      console.error(`ERROR: ${file} - ${status} commands must declare replacement`);
      hasErrors = true;
    }

    if (replacement) {
      const replacementName = replacement.replace(/^\/aw:/, '').replace(/^\//, '');
      if (!validCommands.has(replacementName)) {
        console.error(`ERROR: ${file} - replacement points to non-existent command ${replacement}`);
        hasErrors = true;
      }
    }

    if (status === 'alias' && !forwardMode) {
      console.error(`ERROR: ${file} - alias commands must declare forwardMode`);
      hasErrors = true;
    }

    // Strip fenced code blocks before checking cross-references.
    // Examples/templates inside ``` blocks are not real references.
    const contentNoCodeBlocks = content.replace(/```[\s\S]*?```/g, '');

    // Check cross-references to other commands (e.g., `/build-fix`)
    // Skip lines that describe hypothetical output (e.g., "→ Creates: `/new-table`")
    // Process line-by-line so ALL command refs per line are captured
    // (previous anchored regex /^.*`\/...`.*$/gm only matched the last ref per line)
    for (const line of contentNoCodeBlocks.split('\n')) {
      if (/creates:|would create:/i.test(line)) continue;
      const lineRefs = line.matchAll(/`\/([a-z][-a-z0-9]*)`/g);
      for (const match of lineRefs) {
        const refName = match[1];
        if (!validCommands.has(refName)) {
          console.error(`ERROR: ${file} - references non-existent command /${refName}`);
          hasErrors = true;
        }
      }
    }

    // Check agent references (e.g., "agents/planner.md" or "`planner` agent")
    const agentPathRefs = contentNoCodeBlocks.matchAll(/agents\/([a-z][-a-z0-9]*)\.md/g);
    for (const match of agentPathRefs) {
      const refName = match[1];
      if (!validAgents.has(refName)) {
        console.error(`ERROR: ${file} - references non-existent agent agents/${refName}.md`);
        hasErrors = true;
      }
    }

    // Check skill directory references (e.g., "skills/tdd-workflow/")
    // learned and imported are reserved roots (~/.claude/skills/); no local dir expected
    const reservedSkillRoots = new Set(['learned', 'imported']);
    const skillRefs = contentNoCodeBlocks.matchAll(/skills\/([a-z][-a-z0-9]*)\//g);
    for (const match of skillRefs) {
      const refName = match[1];
      if (reservedSkillRoots.has(refName) || validSkills.has(refName)) continue;
      console.warn(`WARN: ${file} - references skill directory skills/${refName}/ (not found locally)`);
      warnCount++;
    }

    // Check agent name references in workflow diagrams (e.g., "planner -> tdd-guide")
    const workflowLines = contentNoCodeBlocks.matchAll(/^([a-z][-a-z0-9]*(?:\s*->\s*[a-z][-a-z0-9]*)+)$/gm);
    for (const match of workflowLines) {
      const agents = match[1].split(/\s*->\s*/);
      for (const agent of agents) {
        if (!validAgents.has(agent)) {
          console.error(`ERROR: ${file} - workflow references non-existent agent "${agent}"`);
          hasErrors = true;
        }
      }
    }
  }

  if (hasErrors) {
    process.exit(1);
  }

  let msg = `Validated ${files.length} command files`;
  if (warnCount > 0) {
    msg += ` (${warnCount} warnings)`;
  }
  console.log(msg);
}

validateCommands();
