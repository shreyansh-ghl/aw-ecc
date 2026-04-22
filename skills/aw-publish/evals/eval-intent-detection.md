---
name: eval-intent-detection
description: Tests that natural language triggers the publish flow without the user needing to type /aw:publish
type: eval
parent: aw-publish
---

# Eval: Intent Detection

## Setup

You are an AI assistant with the `using-aw-skills` router and all AW skills loaded. The user has been working on CASRE artifacts locally and now wants to publish. They will use natural language — they do NOT know about `/aw:publish`.

## Scenario 1: Casual publish intent

User says: "I'm done testing this agent, send it upstream"

**Expected behavior:**
- The LLM recognizes this as a publish intent
- Loads and follows the `aw-publish` skill
- Runs `aw push --dry-run` first
- Shows what would be pushed
- Asks for confirmation

**FAIL if:** The LLM asks "what do you mean by upstream?" or tries to git push to a branch, or loads a different skill.

## Scenario 2: Question about what's ready

User says: "what would get pushed if I publish now?"

**Expected behavior:**
- Recognized as publish intent (dry-run only)
- Runs `aw push --dry-run`
- Shows the results
- Does NOT ask to push — user is just previewing

**FAIL if:** The LLM treats this as a build or review question, or tries to push without being asked.

## Scenario 3: Namespace-scoped intent

User says: "let's publish everything we built for platform/data today"

**Expected behavior:**
- Recognized as namespace-scoped publish intent
- Runs `aw push .aw_registry/platform/data/ --dry-run`
- Shows changed files in that namespace
- Asks for confirmation

**FAIL if:** The LLM pushes all changes instead of scoping to platform/data, or doesn't recognize the namespace.

## Scenario 4: Rules-specific intent

User says: "the new security rules are ready, push them"

**Expected behavior:**
- Recognized as rules publish intent
- Uses `aw push-rules` (not `aw push`)
- Follows the confirmation gate

**FAIL if:** The LLM uses `aw push` for rules, or doesn't distinguish rules from registry artifacts.

## Scenario 5: NOT a publish intent — UI reference (negative case)

User says: "push this button to the left in the UI"

**Expected behavior:**
- This is NOT a publish intent — it's a frontend/design request
- The LLM should NOT load the aw-publish skill
- Route to the appropriate skill (build, design, etc.)

**FAIL if:** The LLM misinterprets "push" as registry publish when context clearly indicates UI work.

## Scenario 6: NOT a publish intent — git push (negative case)

User says: "push my branch to origin"

**Expected behavior:**
- This is a regular git push — NOT a registry publish
- The LLM should use normal git commands (`git push`)
- Do NOT load the aw-publish skill

**FAIL if:** The LLM runs `aw push` instead of `git push`.

## Scenario 7: NOT a publish intent — code PR (negative case)

User says: "create a PR for my feature branch"

**Expected behavior:**
- This is a code PR request — route to `/aw:deploy` (pr mode)
- Do NOT load the aw-publish skill
- The user is talking about application code, not registry artifacts

**FAIL if:** The LLM routes to aw-publish instead of aw-deploy.

## Scenario 8: NOT a publish intent — deploy (negative case)

User says: "push to staging"

**Expected behavior:**
- This is a deployment request — route to `/aw:deploy` (staging mode)
- Do NOT load the aw-publish skill

**FAIL if:** The LLM confuses "push to staging" with "push to registry".

## Pass Criteria

- [ ] Natural language triggers correctly route to aw-publish skill
- [ ] No false positives — UI/git/unrelated "push" doesn't trigger publish
- [ ] Namespace scoping is correctly extracted from natural language
- [ ] Rules vs registry distinction is detected from context
- [ ] Confirmation gate is followed in all positive scenarios
