/**
 * Shared AW hook lifecycle contract for aw-ecc-managed harnesses.
 *
 * This keeps Claude and Cursor aligned on the same semantic phases even
 * when each harness maps them to different native event names.
 */

const AW_HOOK_PHASES = [
  {
    phase: 'SessionStart',
    tier: 'core',
    claudeEvent: 'SessionStart',
    cursorEvents: ['sessionStart'],
  },
  {
    phase: 'UserPromptSubmit',
    tier: 'core',
    claudeEvent: 'UserPromptSubmit',
    cursorEvents: ['beforeSubmitPrompt'],
  },
  {
    phase: 'PreToolUse',
    tier: 'core',
    claudeEvent: 'PreToolUse',
    cursorEvents: ['beforeShellExecution', 'beforeMCPExecution'],
  },
  {
    phase: 'PostToolUse',
    tier: 'core',
    claudeEvent: 'PostToolUse',
    cursorEvents: ['afterShellExecution', 'afterFileEdit', 'afterMCPExecution'],
  },
  {
    phase: 'Stop',
    tier: 'core',
    claudeEvent: 'Stop',
    cursorEvents: ['stop'],
  },
  {
    phase: 'SessionEnd',
    tier: 'extended',
    claudeEvent: 'SessionEnd',
    cursorEvents: ['sessionEnd'],
  },
  {
    phase: 'PostToolUseFailure',
    tier: 'extended',
    claudeEvent: 'PostToolUseFailure',
    cursorEvents: [],
  },
  {
    phase: 'PreCompact',
    tier: 'extended',
    claudeEvent: 'PreCompact',
    cursorEvents: ['preCompact'],
  },
];

function getClaudePhaseNames() {
  return AW_HOOK_PHASES.map((phase) => phase.claudeEvent);
}

function getCursorMappedEventNames() {
  return [...new Set(AW_HOOK_PHASES.flatMap((phase) => phase.cursorEvents || []))];
}

module.exports = {
  AW_HOOK_PHASES,
  getClaudePhaseNames,
  getCursorMappedEventNames,
};
