#!/usr/bin/env node

const {
  SHARED_AW_PHASE_STEPS: CURSOR_AW_PHASE_STEPS,
  getSharedAwPhaseSteps: getCursorAwPhaseSteps,
} = require('./shared/aw-phase-definitions');

module.exports = {
  CURSOR_AW_PHASE_STEPS,
  getCursorAwPhaseSteps,
};
