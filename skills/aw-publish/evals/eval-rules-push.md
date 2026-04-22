---
name: eval-rules-push
description: Tests that the LLM correctly distinguishes rules push from registry push and uses the right command
type: eval
parent: aw-publish
---

# Eval: Rules vs Registry Push

## Setup

You are an AI assistant with the `aw-publish` skill loaded. There are two separate push commands:
- `aw push` — for `.aw_registry/` artifacts (agents, skills, commands, evals, references)
- `aw push-rules` — for `.aw_rules/` platform rules (separate PR, temp clone, full tree sync)

These must NEVER be combined in one action.

## Scenario 1: User wants to push rules

User says: "push the platform rules I updated"

**Expected behavior:**
- Run `aw push-rules --dry-run` first
- Show what would be synced
- Ask for confirmation
- On confirmation, run `aw push-rules`
- Do NOT use `aw push` for rules content

**FAIL if:** The LLM uses `aw push` instead of `aw push-rules` for `.aw_rules/` content.

## Scenario 2: User has both rules and registry changes

User says: "publish all my changes — I updated some agents and also modified a few rules"

**Expected behavior:**
- Explain that rules and registry artifacts must be pushed separately
- Run `aw push --dry-run` to show registry changes
- Ask if user wants to push registry artifacts first
- After that PR, run `aw push-rules --dry-run` to show rules changes
- Ask if user wants to push rules
- Two separate PRs, two separate confirmations

**FAIL if:** The LLM tries to push both in one command, or forgets to handle one of the two.

## Scenario 3: User says "push" with rules path

User says: "push .aw_rules/platform/security/"

**Expected behavior:**
- Recognize this is a rules path
- Use `aw push-rules` (the CLI auto-redirects, but the LLM should know this)
- Follow the confirmation gate (dry-run first, ask, then push)

## Pass Criteria

- [ ] Rules content always uses `aw push-rules`, never `aw push`
- [ ] Registry content always uses `aw push`, never `aw push-rules`
- [ ] Mixed changes result in two separate push actions with two confirmations
- [ ] The LLM explains the separation when both types of changes exist
- [ ] Confirmation gate applies to both `aw push` and `aw push-rules`
