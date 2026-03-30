# Experimental `aw:plan` Test Matrix

This matrix tests whether the proposed global `plan` command stays focused by default and only broadens scope when the request clearly asks for it.

## Pass Criteria

- The command picks one primary artifact first.
- The command uses `breadth=single` unless the user explicitly requests more.
- The command does not drift into design for code-planning asks.
- The command does not drift into code for design or PRD asks.
- The command only expands on explicit multi-artifact or end-to-end requests.

## Cases

| # | Input | Expected artifact | Expected breadth | Must not do |
|---|---|---|---|---|
| 1 | "Create a PRD for the new marketplace onboarding flow." | `prd` | `single` | `ux`, `architecture`, `task-plan`, `code` |
| 2 | "Research why users abandon the AI marketplace setup flow." | `research` | `single` | `prd`, `ux`, `task-plan`, `code` |
| 3 | "Write a UX brief for onboarding to the marketplace." | `ux` | `single` | `prd`, `architecture`, `task-plan`, `code` |
| 4 | "Plan the implementation for the new billing webhook retry worker." | `task-plan` | `single` | `ux`, `design generation`, `code` |
| 5 | "Create a technical architecture note for marketplace skill routing." | `architecture` | `single` | `ux`, `code`, `deploy` |
| 6 | "Do research and turn it into a PRD for marketplace onboarding." | `research` | `linked` | `ux`, `code` unless explicitly added |
| 7 | "Create a PRD and UX brief for the first-run marketplace flow." | `prd` | `linked` | `architecture`, `code`, `deploy` |
| 8 | "Create a PRD, UX brief, and implementation plan for the plugin submission flow." | `prd` | `linked` | `code`, `deploy` |
| 9 | "Plan this end to end before development starts: marketplace onboarding." | `research` | `full` | `code`, `deploy` |
| 10 | "Break this feature into tasks: add bulk invite resend to the admin UI." | `task-plan` | `single` | `ux` unless blocked by missing behavior |
| 11 | "Plan the code changes for this approved spec." | `task-plan` | `single` | `prd`, `ux` |
| 12 | "I want everything needed before coding starts for plugin analytics." | `research` | `full` | `code`, `deploy` |

## Edge Cases

### Ambiguous input

Input:

```text
Plan onboarding
```

Expected behavior:

- ask one short clarification question
- do not assume PRD vs UX vs task-plan

### Missing prerequisite

Input:

```text
Make an implementation plan for the new first-run wizard.
```

If no goals, scope, or success criteria exist, expected behavior:

- start as `task-plan / single`
- detect missing prerequisite
- expand only if needed, with explanation
- ask one short question or create a minimal prerequisite note first

### Narrow engineering ask

Input:

```text
Plan the API changes for retry backoff configuration.
```

Expected behavior:

- route to `architecture` or `task-plan`
- stay within engineering scope
- do not create UX or PRD artifacts

## Evaluation Checklist

- [ ] Does each test case map to one clear primary artifact?
- [ ] Does the router default to `single`?
- [ ] Are linked/full cases only triggered by explicit language?
- [ ] Are out-of-scope areas listed clearly in the route contract?
- [ ] Does the command recommend a sensible next command after planning?

## Suggested Next Step

If this matrix looks right, wire the same routing contract into:

1. `aw:execute`
2. `aw:review`
3. `aw:verify`
4. `aw:deploy`

That keeps the public interface small while letting the internal router stay precise.
