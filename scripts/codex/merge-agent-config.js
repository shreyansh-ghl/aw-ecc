#!/usr/bin/env node
'use strict';

/**
 * Merge ECC-recommended Codex agent roles into an existing config.toml.
 *
 * Strategy:
 *   - Enable features.hooks so AW router and Echo handoff reminders reach Codex CLI.
 *   - Enable features.multi_agent because AW SDLC delegates HTML work to Echo.
 *   - Add missing scalar defaults under [agents] without overriding user values.
 *   - Add missing [agents.<name>] sections from the reference config.
 *   - Remove known invalid aliases that older ECC syncs briefly emitted.
 *   - Preserve existing user config, custom agents, MCP servers, profiles, and secrets.
 *
 * Usage:
 *   node merge-agent-config.js <target-config.toml> <source-config.toml> [--dry-run]
 */

const fs = require('fs');

let TOML;
try {
  TOML = require('@iarna/toml');
} catch {
  console.error('[ecc-agents] Missing dependency: @iarna/toml');
  console.error('[ecc-agents] Run: npm install   (from the ECC repo root)');
  process.exit(1);
}

function log(message) {
  console.log(`[ecc-agents] ${message}`);
}

function parseToml(filePath, label) {
  try {
    return TOML.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[ecc-agents] Could not parse ${label}: ${filePath}`);
    console.error(`[ecc-agents] ${error.message}`);
    process.exit(1);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sectionLinePattern(sectionHeader) {
  return new RegExp(`^\\s*${escapeRegExp(sectionHeader)}\\s*(#.*)?$`);
}

function findSectionRange(lines, sectionHeader) {
  const headerPattern = sectionLinePattern(sectionHeader);
  const start = lines.findIndex(line => headerPattern.test(line.replace(/\r$/, '')));
  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s*\[/.test(lines[index].replace(/\r$/, ''))) {
      end = index;
      break;
    }
  }

  return { start, end };
}

function appendSection(raw, sectionText) {
  const trimmedRaw = raw.replace(/\s+$/, '');
  const trimmedSection = sectionText.trim();
  if (!trimmedRaw) {
    return `${trimmedSection}\n`;
  }
  return `${trimmedRaw}\n\n${trimmedSection}\n`;
}

function upsertKey(raw, sectionHeader, key, valueText, options = {}) {
  const override = options.override === true;
  const lines = raw.split('\n');
  const range = findSectionRange(lines, sectionHeader);
  const keyPattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`);

  if (!range) {
    return appendSection(raw, `${sectionHeader}\n${key} = ${valueText}`);
  }

  for (let index = range.start + 1; index < range.end; index += 1) {
    if (keyPattern.test(lines[index].replace(/\r$/, ''))) {
      if (override) {
        lines[index] = `${key} = ${valueText}`;
        return lines.join('\n');
      }
      return raw;
    }
  }

  lines.splice(range.start + 1, 0, `${key} = ${valueText}`);
  return lines.join('\n');
}

function removeKey(raw, sectionHeader, key) {
  const lines = raw.split('\n');
  const range = findSectionRange(lines, sectionHeader);
  const keyPattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`);

  if (!range) {
    return raw;
  }

  for (let index = range.start + 1; index < range.end; index += 1) {
    if (keyPattern.test(lines[index].replace(/\r$/, ''))) {
      lines.splice(index, 1);
      return lines.join('\n').replace(/\n{3,}/g, '\n\n');
    }
  }

  return raw;
}

function tomlKey(name) {
  if (/^[A-Za-z0-9_-]+$/.test(name)) {
    return name;
  }
  return JSON.stringify(name);
}

function agentSectionHeader(name) {
  return `[agents.${tomlKey(name)}]`;
}

function extractSection(raw, sectionHeader) {
  const lines = raw.split('\n');
  const range = findSectionRange(lines, sectionHeader);
  if (!range) {
    return null;
  }
  return lines.slice(range.start, range.end).join('\n').trim();
}

function removeSection(raw, sectionHeader) {
  const lines = raw.split('\n');
  const range = findSectionRange(lines, sectionHeader);
  if (!range) {
    return raw;
  }

  lines.splice(range.start, range.end - range.start);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

function quoteTomlString(value) {
  return JSON.stringify(String(value));
}

function buildAgentSection(name, config) {
  const lines = [agentSectionHeader(name)];
  if (typeof config.description === 'string') {
    lines.push(`description = ${quoteTomlString(config.description)}`);
  }
  if (typeof config.config_file === 'string') {
    lines.push(`config_file = ${quoteTomlString(config.config_file)}`);
  }
  return lines.join('\n');
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const positional = args.filter(arg => !arg.startsWith('-'));
  const targetPath = positional[0];
  const sourcePath = positional[1];

  if (!targetPath || !sourcePath) {
    console.error('Usage: merge-agent-config.js <target-config.toml> <source-config.toml> [--dry-run]');
    process.exit(1);
  }

  if (!fs.existsSync(targetPath)) {
    console.error(`[ecc-agents] Target config not found: ${targetPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(sourcePath)) {
    console.error(`[ecc-agents] Source config not found: ${sourcePath}`);
    process.exit(1);
  }

  const sourceRaw = fs.readFileSync(sourcePath, 'utf8');
  let targetRaw = fs.readFileSync(targetPath, 'utf8');
  const source = parseToml(sourcePath, 'source config');
  const target = parseToml(targetPath, 'target config');

  const changes = [];

  for (const sectionHeader of ['[agents."aw:echo"]']) {
    const nextRaw = removeSection(targetRaw, sectionHeader);
    if (nextRaw !== targetRaw) {
      targetRaw = nextRaw;
      changes.push(`removed invalid ${sectionHeader}`);
    }
  }

  const withoutDeprecatedCodexHooks = removeKey(targetRaw, '[features]', 'codex_hooks');
  if (withoutDeprecatedCodexHooks !== targetRaw) {
    targetRaw = withoutDeprecatedCodexHooks;
    changes.push('removed deprecated features.codex_hooks');
  }

  if (source.features && source.features.hooks === true && target.features?.hooks !== true) {
    targetRaw = upsertKey(targetRaw, '[features]', 'hooks', 'true', { override: true });
    changes.push('enabled features.hooks');
  }

  if (source.features && source.features.multi_agent === true && target.features?.multi_agent !== true) {
    targetRaw = upsertKey(targetRaw, '[features]', 'multi_agent', 'true', { override: true });
    changes.push('enabled features.multi_agent');
  }

  const sourceAgents = isPlainObject(source.agents) ? source.agents : {};
  const targetAgents = isPlainObject(target.agents) ? target.agents : {};

  for (const key of ['max_threads', 'max_depth']) {
    if (Object.prototype.hasOwnProperty.call(sourceAgents, key)
      && !Object.prototype.hasOwnProperty.call(targetAgents, key)) {
      targetRaw = upsertKey(targetRaw, '[agents]', key, String(sourceAgents[key]));
      changes.push(`added agents.${key}`);
    }
  }

  const agentNames = Object.keys(sourceAgents)
    .filter(name => isPlainObject(sourceAgents[name]))
    .sort();

  for (const name of agentNames) {
    if (isPlainObject(targetAgents[name])) {
      continue;
    }

    const header = agentSectionHeader(name);
    const section = extractSection(sourceRaw, header) || buildAgentSection(name, sourceAgents[name]);
    targetRaw = appendSection(targetRaw, section);
    changes.push(`added ${header}`);
  }

  if (changes.length === 0) {
    log('Codex agent config already up to date');
    return;
  }

  if (dryRun) {
    for (const change of changes) {
      log(`[dry-run] ${change}`);
    }
    return;
  }

  fs.writeFileSync(targetPath, targetRaw);
  for (const change of changes) {
    log(change);
  }
}

main();
