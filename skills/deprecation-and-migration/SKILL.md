---
name: deprecation-and-migration
description: Removes old systems safely and migrates consumers deliberately. Use when sunsetting features, replacing interfaces, or consolidating duplicate implementations.
origin: ECC
---

# Deprecation and Migration

## Overview

Code is not automatically an asset.
Every old path, endpoint, flag, dependency, or subsystem carries maintenance, security, and cognitive cost.
This skill helps decide what should be removed, how consumers move safely, and when the old path can finally disappear.

## When to Use

- replacing an old API, library, feature, or workflow
- removing dead or duplicate code
- migrating users, services, or teams to a new implementation
- planning removal of deprecated behavior
- deciding whether to maintain versus sunset a legacy path

**When NOT to use**

- no replacement or migration path exists yet
- the change is a purely additive feature with no retirement surface

## Workflow

1. Prove the deprecation case first.
   Clarify:
   - what unique value the old path still provides
   - who depends on it
   - what it costs to keep maintaining it
   - what the replacement is
2. Choose the deprecation posture deliberately.
   Decide whether the change is advisory or compulsory.
   Default to advisory unless risk, security, or platform pressure requires a deadline.
3. Build the replacement and migration path before removal.
   Use adapters, feature flags, or strangler patterns where needed.
   For schema or data moves, coordinate with the existing migration skills and repo standards.
4. Migrate incrementally and measure usage.
   Move consumers one by one when possible.
   Use logs, metrics, dependency scans, or runtime evidence to prove who still depends on the old path.
5. Remove the legacy path only after real usage is gone.
   Delete the old code, tests, docs, config, and deprecation notices once they have served their purpose.
6. Document the lifecycle decision.
   Use `references/deprecation-and-migration.md` and `documentation-and-adrs` when future engineers need the why and the removal plan.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It still works, so we should keep it." | Working but unowned code quietly accumulates cost and risk. |
| "Users will migrate on their own." | Most consumers need tooling, help, or active churn management. |
| "We can maintain both forever." | Duplicate systems multiply maintenance and slow future work. |
| "We'll remove it once the new system settles." | Without an explicit removal plan, the old path usually survives indefinitely. |

## Red Flags

- a deprecation is announced without a working replacement
- active usage is guessed instead of measured
- the old path keeps receiving new feature work
- code is removed before consumer migration is proven
- dead docs, tests, or flags remain after the "migration" is supposedly done

## Verification

After deprecation or migration work, confirm:

- [ ] the replacement exists and covers critical use cases
- [ ] usage and migration scope were measured, not guessed
- [ ] the migration path is documented and actionable
- [ ] remaining consumers are explicit or zero
- [ ] old code, tests, docs, and config are removed only after real migration proof
