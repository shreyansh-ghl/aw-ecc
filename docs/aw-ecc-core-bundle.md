# AW ECC Core Bundle

This is the smallest obvious path through `aw-ecc` for teams who want a strong default workflow without learning the whole catalog first.

## Public Stage Flow

The public AW surface stays intentionally small:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`
- `/aw:ship`

If you only remember one default workflow, use this:

1. `/aw:plan` when direction still needs to become a concrete artifact set.
2. `/aw:execute` when the work is approved and ready to implement.
3. `/aw:verify` when you need objective review, validation, and readiness evidence.
4. `/aw:deploy` when the requested outcome is one release action.
5. `/aw:ship` only when the work really needs the broader end-to-end or multi-release closeout path.

## Small Obvious Path

Use this default mental model:

- vague request -> `/aw:plan`
- approved implementation request -> `/aw:execute`
- "prove it works" or "review this" -> `/aw:verify`
- "deploy this" -> `/aw:deploy`
- "take this all the way through" -> `/aw:ship`

This keeps the first-run experience centered on stage boundaries instead of the full command catalog.

## Install Profile Shortcut

If you are installing `aw-ecc` directly, keep the same small-first mindset for setup:

- `core` when you want the smallest safe baseline
- `developer` for most active engineering work
- `security` or `research` when that is the dominant use case
- `full` only when you explicitly want the broadest surface on day one

For the focused profile guide and real installer examples, read [aw-ecc-install-profiles.md](./aw-ecc-install-profiles.md).

## Trust Before Scale

Before you add more tools, more parallelism, or broader install surface, lock in the safe defaults:

- smaller install profile
- fewer enabled MCPs per project
- approval boundaries around risky actions
- narrow memory for untrusted workflows
- isolation for untrusted repos and foreign content

For the focused trust model, read [aw-ecc-security-posture.md](./aw-ecc-security-posture.md).

## Supporting Skills Worth Learning Early

These are the few repo-local skills most likely to make the biggest difference early:

- `aw-brainstorm` for discovery-heavy planning before the plan is frozen
- `aw-spec` for technical contract authoring inside planning
- `aw-tasks` for turning a spec into an execution-ready recipe
- `tdd-workflow` for implementation discipline
- `verification-loop` for structured quality proof
- `security-review` for security-focused checks
- `security-scan` for config and prompt-injection hygiene checks
- `e2e-testing` for browser-level proof when local tests are not enough
- `strategic-compact` for context management during longer sessions

You do not need to memorize these up front.
The public AW commands are still the default entrypoint.

## Capability Map

If you want X, start with Y:

| If you want... | Start with... |
|---|---|
| turn a vague idea into artifacts | `/aw:plan` |
| implement approved work | `/aw:execute` |
| review or prove the work | `/aw:verify` |
| perform one release action | `/aw:deploy` |
| run the broader closeout flow | `/aw:ship` |
| shape the plan before writing it | `aw-brainstorm` |
| improve implementation discipline | `tdd-workflow` |
| strengthen final proof | `verification-loop` |
| run browser-level validation | `e2e-testing` |

## Why This Exists

`aw-ecc` has a large catalog on purpose, but onboarding should not feel large.

The core bundle exists so that:

- the first touch is stage-oriented instead of catalog-oriented
- teams can adopt the AW workflow without learning every supporting skill
- deeper repo-local skills become progressive disclosure instead of mandatory study

## Next Step

After the public stage flow feels natural, then expand into:

- supporting planning helpers
- TDD and verification support
- domain-specific patterns
- orchestration and advanced workflow skills

For the next layer after this core bundle, read [aw-ecc-leverage-patterns.md](./aw-ecc-leverage-patterns.md).
That guide focuses on the patterns that improve long-session quality and repeatability.
