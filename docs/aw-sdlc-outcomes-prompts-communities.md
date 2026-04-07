# AW SDLC Outcomes Prompts: Communities

## Purpose

This is the Communities-focused prompt pack for outcome-oriented SDLC evaluation.

These prompts are intentionally:

- plain-English
- intent-first
- free of slash commands
- split across one backend app and one frontend app

They are meant to test whether the AW workflow can choose the right stage on its own while still producing high-quality artifacts, a production-ready PR path, and versioned staging deployment behavior.

## Backend App: Communities Moderation API

### 1. Technical planning

Prompt:

```text
Create the implementation spec for the approved Communities moderation API contract.
Do not make me write a PRD first.
```

Expected route:

- `plan`

Why it matters:

- proves the system can start from an approved technical contract without over-planning

### 2. Execution

Prompt:

```text
Take the approved Communities moderation API change forward and make the required code updates in the moderation queue path.
```

Expected route:

- `build`

Why it matters:

- proves the system can move from approved planning into the right implementation stage without an explicit command

### 3. Verification

Prompt:

```text
Review this Communities moderation API PR and tell me if it is ready for staging.
```

Expected route:

- `review`

Why it matters:

- proves the system can run validation, checklist review, and PR readiness checks from plain language

### 4. Staging deployment

Prompt:

```text
Deploy this verified Communities moderation API service to staging.
```

Expected route:

- `deploy`

Why it matters:

- proves the deploy stage can be selected from intent and can resolve the versioned microservice path

### 5. Full end-to-end cycle

Prompt:

```text
Take this Communities moderation API change through PR creation and staging version deployment.
```

Expected route:

- `aw-yolo`

Why it matters:

- proves the full backend cycle works from plain language, including PR and staging outcome

## Frontend App: Communities Feed MFA

### 6. Technical planning

Prompt:

```text
Create the implementation spec for the approved Communities feed MFA change.
```

Expected route:

- `plan`

Why it matters:

- proves frontend work can start with the correct planning stage without a slash command

### 7. Execution

Prompt:

```text
Take the approved Communities feed MFA UI change forward and update the app accordingly.
```

Expected route:

- `build`

Why it matters:

- proves the system can choose execution for frontend app work without explicit stage selection

### 8. Verification

Prompt:

```text
Review this Communities feed MFA PR and tell me if it is ready for staging.
```

Expected route:

- `review`

Why it matters:

- proves frontend verification can cover design, quality, and readiness from intent alone

### 9. Staging deployment

Prompt:

```text
Deploy this verified Communities feed MFA to staging.
```

Expected route:

- `deploy`

Why it matters:

- proves the deploy stage can resolve the versioned MFA path from plain language

### 10. Full end-to-end cycle

Prompt:

```text
Take this Communities feed MFA change through PR creation and staging version deployment.
```

Expected route:

- `aw-yolo`

Why it matters:

- proves the full frontend cycle works from intent and not only from explicit commands

## Why These 10 Add Value

Together these prompts test:

- one backend app
- one frontend app
- five core lifecycle stages plus `aw-yolo`
- plain-language routing without slash commands
- PR readiness and verification quality
- versioned staging deployment behavior
- full-cycle `aw-yolo` behavior for both app types

## Recommendation

Use this as the stakeholder-facing prompt matrix.

For automated confidence:

- the routing suite should include representative Communities backend and frontend prompts
- the outcomes artifact-writing suite can later be duplicated with full Communities fixtures once we want domain-specific real repos instead of the current generic contact-sync fixtures
