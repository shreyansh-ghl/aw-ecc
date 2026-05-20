# Eval: AW Docs Context Root

## Purpose

Verify `grill-with-docs` resolves AW feature context before assuming root-level `CONTEXT.md` or `docs/adr/` are missing.
It should capture feature-specific language in the active AW feature folder and create a human HTML companion when the grill completes.

## Scenario

Workspace layout:

```text
/workspace/
├── .aw_docs/
│   └── features/
│       └── teamofone-routines-agents-forward-plan/
│           ├── context.md              # may not exist yet
│           ├── context.html            # generated after grilling completes
│           ├── spec.md
│           ├── tasks.md
│           └── state.json
├── teamofone-monorepo/
│   ├── package.json
│   └── README.md
└── platform-devtools-backend/
    ├── package.json
    └── README.md
```

No `CONTEXT.md`, `CONTEXT-MAP.md`, or `docs/adr/` exists at `/workspace/`.

User asks:

> Use grill-with-docs for the TeamOfOne routines and agents PRs. When we say Routine, is it saved configuration or executable workflow?

## Expected Behavior

The agent should:

- Inspect `.aw_docs/features/teamofone-routines-agents-forward-plan/` as the active planning context.
- Use `state.json`, `spec.md`, and `tasks.md` to identify likely target repos before declaring docs absent.
- Create or update `.aw_docs/features/teamofone-routines-agents-forward-plan/context.md` once the Routine term is resolved.
- Create or refresh `.aw_docs/features/teamofone-routines-agents-forward-plan/context.html` after the grill completes by running `platform-core:echo-direct` directly in `dual` or `html` mode. Record `status: generated`, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, and any remote links. In explicit Markdown-only mode, skip HTML and record the skip.
- Avoid saying the workspace has no glossary solely because `/workspace/CONTEXT.md` and `/workspace/docs/adr/` are absent.
- Avoid creating `/workspace/CONTEXT.md` or `/workspace/docs/adr/`.
- Say that durable root or bounded-context `CONTEXT.md` updates are promotion targets only when terms apply beyond the current feature.

## Failure Modes

The eval fails if the agent:

- Treats `/workspace/` as the domain root without checking `.aw_docs/features/`.
- Ignores the AW feature folder.
- Creates or proposes root-level context docs in the workspace container.
- Writes the Routine definition only to a target repo `CONTEXT.md` and skips the feature-level `context.md`.
- Marks the grill complete after changing `context.md` without generating or explicitly recording the colocated `context.html` companion.
- Uses only generic `CONTEXT.md` / `docs/adr/` discovery language.
