function normalizeLineEndings(content) {
  return String(content).replace(/\r\n/g, '\n');
}

function parseFrontmatter(content) {
  const normalized = normalizeLineEndings(content);
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  const attributes = {};

  if (!match) {
    return attributes;
  }

  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    attributes[key] = value;
  }

  return attributes;
}

module.exports = {
  normalizeLineEndings,
  parseFrontmatter,
};
