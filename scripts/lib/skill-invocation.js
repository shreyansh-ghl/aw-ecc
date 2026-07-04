'use strict';

/**
 * Skill invocation marker support.
 *
 * A skill declares `invocation: auto | slash` in its frontmatter (default
 * `slash`). `auto` skills fire from natural language, so the model needs their
 * full description in the standing skill list. `slash`/internal skills are
 * reached by an explicit command, by the Skill tool by name, or by a parent
 * skill, so their description is dead weight in the always-on list.
 *
 * This module provides:
 *  - firstSentenceOrClamp: the P2 trim primitive (one-line floor, never empty)
 *  - classifyInvocation:   default-slash classification
 *  - lintInvocation:       P1 lint coupling invocation to trigger text
 *  - trimSkillContent:     apply the trim to a SKILL.md string, structure-safe
 */

const DEFAULT_CLAMP = 100;

function firstSentenceOrClamp(description, n = DEFAULT_CLAMP) {
  const desc = String(description || '').trim();
  if (!desc) return '';
  const sentence = desc.split(/(?<=[.!?])\s/)[0].trim();
  if (sentence && sentence.length <= n) return sentence;
  if (desc.length <= n) return desc;
  const hard = desc.slice(0, n);
  const cut = hard.replace(/\s+\S*$/, '').trim();
  return cut || hard.trim();
}

function classifyInvocation(frontmatter) {
  const v = String((frontmatter && frontmatter.invocation) || '').trim().toLowerCase();
  return v === 'auto' ? 'auto' : 'slash';
}

// Trigger phrasing that marks a skill as parent-called / internal.
const INTERNAL_TRIGGER = /internal only|invoked by\b/i;
// Trigger phrasing that reads as natural-language user intent.
const NL_INTENT = /when (?:a |the )?user|when the user asks|user wants|asks to|asks for/i;
// A direct user-intent clause that legitimizes `auto` even alongside an
// internal trigger (e.g. "Invoked by X ... or directly when a user wants Y").
const DIRECT_INTENT = /directly when|or when (?:a |the )?user|user wants|user asks/i;
// "Internal only" is an absolute claim — no direct-intent escape hatch.
const INTERNAL_ABSOLUTE = /internal only/i;
// Presence of an explicit slash route in the trigger.
const HAS_COMMAND = /\/[a-z]/i;

function lintInvocation(frontmatter) {
  const errors = [];
  const warnings = [];
  const fm = frontmatter || {};
  const invocation = classifyInvocation(fm);
  const trigger = String(fm.trigger || '');

  if (!fm.invocation) {
    warnings.push('invocation missing; defaulting to slash — make it explicit');
  }

  // Error only when the trigger is internal with no legitimate direct-user
  // clause. "Internal only" is absolute; "Invoked by X" can be rescued by an
  // explicit "or directly when a user..." clause (a genuinely mixed skill).
  const internalWithoutEscape =
    INTERNAL_ABSOLUTE.test(trigger) ||
    (INTERNAL_TRIGGER.test(trigger) && !DIRECT_INTENT.test(trigger));
  if (invocation === 'auto' && internalWithoutEscape) {
    errors.push(
      'invocation:auto contradicts an internal/parent-called trigger — internal skills must be slash'
    );
  }

  if (invocation === 'slash' && NL_INTENT.test(trigger) && !HAS_COMMAND.test(trigger)) {
    warnings.push(
      'invocation:slash but trigger reads as natural-language intent with no command — may need auto'
    );
  }

  return { errors, warnings, invocation };
}

/**
 * Parse just enough frontmatter to read invocation/description/trigger while
 * keeping the raw lines so we can rewrite one line without disturbing the rest.
 */
function splitFrontmatter(content) {
  const match = String(content).match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*)?$/);
  if (!match) return null;
  const lines = match[1].split('\n');
  const fm = {};
  for (const line of lines) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    fm[key] = val;
  }
  return { fmLines: lines, fm, body: match[2] || '' };
}

/**
 * Apply the invocation trim to a SKILL.md string.
 * Returns { content, invocation, changed, before, after }.
 * - auto: unchanged.
 * - slash: description line rewritten to firstSentenceOrClamp (never empty).
 * All other frontmatter and the body are preserved verbatim.
 */
function trimSkillContent(content, n = DEFAULT_CLAMP) {
  const parsed = splitFrontmatter(content);
  if (!parsed) {
    return { content, invocation: 'slash', changed: false, before: 0, after: 0 };
  }
  const invocation = classifyInvocation(parsed.fm);
  const before = String(parsed.fm.description || '').length;

  if (invocation === 'auto') {
    return { content, invocation, changed: false, before, after: before };
  }

  const trimmed = firstSentenceOrClamp(parsed.fm.description || '', n);
  const after = trimmed.length;
  if (after === before) {
    return { content, invocation, changed: false, before, after };
  }

  const newLines = parsed.fmLines.map(line => {
    if (/^description:/.test(line.trim()) || /^description:/.test(line)) {
      return `description: ${trimmed}`;
    }
    return line;
  });
  const newContent = `---\n${newLines.join('\n')}\n---${parsed.body}`;
  return { content: newContent, invocation, changed: true, before, after };
}

module.exports = {
  firstSentenceOrClamp,
  classifyInvocation,
  lintInvocation,
  splitFrontmatter,
  trimSkillContent,
};
