/**
 * Shared AW hook lifecycle contract for aw-ecc-managed harnesses.
 *
 * This keeps Claude, Codex, and Cursor aligned on the same semantic phases
 * even when each harness maps them to different native event names.
 */

const AW_HOOK_PHASES = [
  {
    phase: 'SessionStart',
    tier: 'core',
    claudeEvent: 'SessionStart',
    codexEvent: 'SessionStart',
    cursorEvents: ['sessionStart'],
  },
  {
    phase: 'UserPromptSubmit',
    tier: 'core',
    claudeEvent: 'UserPromptSubmit',
    codexEvent: 'UserPromptSubmit',
    cursorEvents: ['beforeSubmitPrompt'],
  },
  {
    phase: 'PreToolUse',
    tier: 'core',
    claudeEvent: 'PreToolUse',
    codexEvent: 'PreToolUse',
    cursorEvents: ['beforeShellExecution', 'beforeMCPExecution'],
  },
  {
    phase: 'PostToolUse',
    tier: 'core',
    claudeEvent: 'PostToolUse',
    codexEvent: 'PostToolUse',
    cursorEvents: ['afterShellExecution', 'afterFileEdit', 'afterMCPExecution', 'postToolUse'],
  },
  {
    phase: 'Stop',
    tier: 'core',
    claudeEvent: 'Stop',
    codexEvent: 'Stop',
    cursorEvents: ['stop'],
  },
  {
    phase: 'SessionEnd',
    tier: 'extended',
    claudeEvent: 'SessionEnd',
    codexEvent: null,
    cursorEvents: ['sessionEnd'],
  },
  {
    phase: 'PostToolUseFailure',
    tier: 'extended',
    claudeEvent: 'PostToolUseFailure',
    codexEvent: null,
    cursorEvents: ['postToolUseFailure'],
  },
  {
    phase: 'PreCompact',
    tier: 'extended',
    claudeEvent: 'PreCompact',
    codexEvent: null,
    cursorEvents: ['preCompact'],
  },
];

function getClaudePhaseNames() {
  return AW_HOOK_PHASES.map((phase) => phase.claudeEvent);
}

function getCursorMappedEventNames() {
  return [...new Set(AW_HOOK_PHASES.flatMap((phase) => phase.cursorEvents || []))];
}

function getCodexPhaseNames() {
  return AW_HOOK_PHASES
    .map((phase) => phase.codexEvent)
    .filter(Boolean);
}

module.exports = {
  AW_HOOK_PHASES,
  getClaudePhaseNames,
  getCodexPhaseNames,
  getCursorMappedEventNames,
};
