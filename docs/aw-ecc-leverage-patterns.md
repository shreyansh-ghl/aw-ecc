# AW ECC Leverage Patterns

This guide is the next stop after [aw-ecc-core-bundle.md](./aw-ecc-core-bundle.md).

The core bundle tells you how to move through the AW stages.
This guide tells you which patterns make longer sessions compound instead of degrade.

## The Four Patterns That Matter Most

If you only learn a few advanced patterns early, learn these:

1. context management
2. verification discipline
3. session memory and learning
4. cost and context budgeting

## 1. Context Management

Long sessions usually get worse for one of two reasons:

- too much stale context stays loaded
- context gets compacted at the wrong time

Start with:

- [docs/token-optimization.md](./token-optimization.md)
- [strategic-compact](../skills/strategic-compact/SKILL.md)

Use `strategic-compact` when you want better timing around `/compact`.
The main idea is simple:

- compact after exploration, before implementation
- compact after debugging, before unrelated work
- do not compact in the middle of active implementation

## 2. Verification Discipline

The stage flow tells you to use `/aw:verify`.
The deeper habit is to make verification a repeated working pattern, not just a final step.

Start with:

- [verification-loop](../skills/verification-loop/SKILL.md)

Use this pattern when:

- a feature is done
- a refactor needs proof
- you want a cleaner pre-PR routine
- you are at risk of trusting intuition instead of evidence

The important shift is:

- build, type, lint, test, security, diff review
- treat failures as real signals
- do not wait until the very end of a long session to check quality

## 3. Session Memory And Learning

AW gets more leverage when the system stops relearning the same lessons every session.

Start with:

- [continuous-learning-v2](../skills/continuous-learning-v2/SKILL.md)
- [docs/continuous-learning-v2-spec.md](./continuous-learning-v2-spec.md)

This is the right next layer when:

- the same corrections keep recurring
- you want project-scoped learned behavior
- you want useful patterns to evolve into reusable skills or commands

The core idea is:

- capture observations through hooks
- turn repeated behavior into instincts
- keep project-specific patterns project-specific
- promote only the patterns that really generalize

## 4. Cost And Context Budgeting

Not every slowdown is a model problem.
Sometimes the harness is just overloaded.

Start with:

- [docs/token-optimization.md](./token-optimization.md)
- [context-budget](../skills/context-budget/SKILL.md)

Use these when:

- the session feels sluggish
- too many MCP tools are active
- context headroom is collapsing
- you are trying to scale to longer workflows or more agents

The practical rule:

- protect context like a real budget
- be suspicious of silent tool bloat
- prefer a few active, relevant components over a giant always-on setup

## Suggested Learning Order

If you are adopting these patterns incrementally:

1. `strategic-compact`
2. `verification-loop`
3. `continuous-learning-v2`
4. `context-budget`

This order keeps the first gains practical:

- better context timing
- better quality proof
- better carry-forward learning
- better overall harness efficiency

## When To Stop Reading And Go Back To Work

You do not need to master every advanced pattern before using `aw-ecc`.

The practical threshold is:

- you know the AW stage flow
- you know when to compact strategically
- you know how to verify before trusting a result
- you know where learning and budget controls live

That is enough to get the compounding benefit without turning setup into homework.
