function scalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '[]') return [];
  if (value === '{}') return {};
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

function indentOf(line) {
  return line.match(/^ */)[0].length;
}

function nextMeaningful(lines, start) {
  let index = start;
  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (trimmed && !trimmed.startsWith('#')) {
      return index;
    }
    index += 1;
  }
  return index;
}

function parseSequence(lines, start, indent) {
  const result = [];
  let index = start;

  while (index < lines.length) {
    index = nextMeaningful(lines, index);
    if (index >= lines.length || indentOf(lines[index]) < indent) {
      break;
    }

    if (indentOf(lines[index]) !== indent || !lines[index].trim().startsWith('- ')) {
      break;
    }

    const trimmed = lines[index].trim().slice(2).trim();
    if (trimmed) {
      result.push(scalar(trimmed));
      index += 1;
      continue;
    }

    const childIndex = nextMeaningful(lines, index + 1);
    if (childIndex >= lines.length || indentOf(lines[childIndex]) <= indent) {
      result.push(null);
      index = childIndex;
      continue;
    }

    const [value, nextIndex] = parseBlock(lines, childIndex, indentOf(lines[childIndex]));
    result.push(value);
    index = nextIndex;
  }

  return [result, index];
}

function parseMapping(lines, start, indent) {
  const result = {};
  let index = start;

  while (index < lines.length) {
    index = nextMeaningful(lines, index);
    if (index >= lines.length || indentOf(lines[index]) < indent) {
      break;
    }

    if (indentOf(lines[index]) !== indent) {
      break;
    }

    const trimmed = lines[index].trim();
    if (trimmed.startsWith('- ')) {
      break;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid baseline YAML line: ${trimmed}`);
    }

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();

    if (rawValue) {
      result[key] = scalar(rawValue);
      index += 1;
      continue;
    }

    const childIndex = nextMeaningful(lines, index + 1);
    if (childIndex >= lines.length || indentOf(lines[childIndex]) <= indent) {
      result[key] = {};
      index = childIndex;
      continue;
    }

    const [value, nextIndex] = parseBlock(lines, childIndex, indentOf(lines[childIndex]));
    result[key] = value;
    index = nextIndex;
  }

  return [result, index];
}

function parseBlock(lines, start, indent) {
  const index = nextMeaningful(lines, start);
  if (index >= lines.length) {
    return [undefined, index];
  }

  if (lines[index].trim().startsWith('- ')) {
    return parseSequence(lines, index, indent);
  }

  return parseMapping(lines, index, indent);
}

function parseBaselineCatalog(yamlText) {
  const lines = yamlText.replace(/\r\n/g, '\n').split('\n');
  const [catalog] = parseBlock(lines, 0, 0);
  return catalog || {};
}

function normalizeVerify(verify = {}) {
  const sections = verify.layers || verify;
  return {
    code_review: sections.code_review || {},
    local_validation: sections.local_validation || {},
    e2e_validation: sections.e2e_validation || {},
    external_validation: sections.external_validation || {},
    pr_governance: sections.pr_governance || {},
    release_readiness: sections.release_readiness || {},
  };
}

function normalizeDeploy(deploy = {}) {
  const modes = deploy.modes || deploy;
  return {
    pr: modes.pr || {},
    branch: modes.branch || {},
    staging: modes.staging || {},
    production: modes.production || {},
    versioning: deploy.versioning || {},
    post_deploy_checks: deploy.post_deploy_checks || [],
    guards: deploy.guards || {},
  };
}

function normalizeBaselineCatalog(catalog = {}) {
  const baselines = {};

  for (const [baselineName, baseline] of Object.entries(catalog.baselines || {})) {
    baselines[baselineName] = {
      description: baseline.description || '',
      verify: normalizeVerify(baseline.verify),
      deploy: normalizeDeploy(baseline.deploy),
    };
  }

  return {
    version: catalog.version,
    owner: catalog.owner,
    description: catalog.description,
    resolution_order: catalog.resolution_order || [],
    baselines,
  };
}

module.exports = {
  parseBaselineCatalog,
  normalizeBaselineCatalog,
};
