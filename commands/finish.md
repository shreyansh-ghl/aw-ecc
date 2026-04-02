---
name: aw:finish
description: Legacy completion helper retained for compatibility while the public release stage converges on aw:deploy.
argument-hint: "<verified work or release handoff>"
status: deprecated
stage: deploy
internal_skill: aw-finish
replaced-by: aw:deploy
---

# Finish

`/aw:finish` is a legacy helper.

Use `/aw:deploy` as the public release entrypoint.
This helper may remain available temporarily for compatibility or migration.

## Deprecation Timeline

`/aw:finish` is deprecated only as a public entrypoint.
The internal `aw-finish` skill remains active until `/aw:deploy` fully absorbs the branch-completion decision flow and workspace cleanup metadata.
Do not remove the compatibility helper before that migration is complete.
