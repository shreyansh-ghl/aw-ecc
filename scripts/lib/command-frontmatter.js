const fs = require('fs');

const VALID_COMMAND_STATUS = new Set(['active', 'alias', 'deprecated']);
const VALID_FORWARD_MODES = new Set(['silent', 'warn', 'stop']);

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseCommandFrontmatter(content) {
  if (typeof content !== 'string') {
    return { attributes: {}, body: '', hasFrontmatter: false };
  }

  if (!content.startsWith('---\n')) {
    return { attributes: {}, body: content, hasFrontmatter: false };
  }

  const closingIndex = content.indexOf('\n---\n', 4);
  if (closingIndex === -1) {
    return { attributes: {}, body: content, hasFrontmatter: false };
  }

  const rawFrontmatter = content.slice(4, closingIndex);
  const body = content.slice(closingIndex + 5);
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

  return { attributes, body, hasFrontmatter: true };
}

function loadCommandMetadata(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return parseCommandFrontmatter(content);
}

module.exports = {
  VALID_COMMAND_STATUS,
  VALID_FORWARD_MODES,
  loadCommandMetadata,
  parseCommandFrontmatter,
};
