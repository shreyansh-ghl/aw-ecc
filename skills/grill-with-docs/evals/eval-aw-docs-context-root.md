# Eval: AW Docs Context Root

## Purpose

Verify `grill-with-docs` resolves AW feature context before assuming root-level `CONTEXT.md` or `docs/adr/` are missing.

## Scenario

Workspace layout:

```text
/workspace/
├── .aw_docs/
│   └── features/
│       └── teamofone-routines-agents-forward-plan/
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
- Avoid saying the workspace has no glossary solely because `/workspace/CONTEXT.md` and `/workspace/docs/adr/` are absent.
- Avoid creating `/workspace/CONTEXT.md` or `/workspace/docs/adr/`.
- Say that durable context docs should be created only in the resolved target repo or bounded context after terms are agreed.

## Failure Modes

The eval fails if the agent:

- Treats `/workspace/` as the domain root without checking `.aw_docs/features/`.
- Ignores the AW feature folder.
- Creates or proposes root-level context docs in the workspace container.
- Uses only generic `CONTEXT.md` / `docs/adr/` discovery language.
