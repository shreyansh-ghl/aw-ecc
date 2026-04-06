# AW ECC Security Posture

This guide is the product-facing trust contract for `aw-ecc`.

It is not a replacement for [SECURITY.md](../SECURITY.md), which covers vulnerability disclosure.
It is also not a replacement for [the-security-guide.md](../the-security-guide.md), which is the broader agentic-security essay.

This document answers the practical question:

How should a team run `aw-ecc` so the convenience layer does not outrun the isolation layer?

## Threat Model

Assume `aw-ecc` will eventually touch at least one of these:

- an untrusted repo
- a poisoned PR, issue, or linked document
- tool output that contains malicious instructions
- an over-trusted MCP server
- screenshots, OCR output, PDFs, or other attachment-heavy workflows
- memory or learnings polluted by untrusted content

That means the trust boundary is not the prompt alone.
It is the operating model around permissions, isolation, memory, tools, and release actions.

## Safe Defaults

If you want the short version, start here:

1. install a smaller profile first
2. keep enabled MCPs narrow per project
3. isolate untrusted work
4. require approval for risky actions
5. keep memory narrow and disposable
6. scan the config surface regularly
7. verify before deploy and keep the artifacts

## Install Surface

Use the smallest profile that keeps work moving:

- `core` if you want the safest baseline and can add capabilities intentionally
- `developer` for most normal engineering work
- `security` when the work is security-heavy by design
- `full` only when you intentionally want the broadest surface area

The goal is not minimalism for its own sake.
The goal is reducing accidental trust expansion.

For install examples, see [aw-ecc-install-profiles.md](./aw-ecc-install-profiles.md).

## MCP and Tool Surface

Each enabled MCP increases context load and attack surface.
The repo's token guidance already recommends keeping fewer than 10 MCP servers enabled per project and preferring CLI wrappers when they are sufficient.

Practical defaults:

- enable only the MCPs needed for the current repo
- prefer CLI-backed commands or skills for common GitHub, database, and deploy tasks when possible
- disable MCP servers that are configured globally but unused in the current project
- treat MCP descriptions, schemas, and outputs as part of your trust boundary

See [token-optimization.md](./token-optimization.md) for the current MCP cost guidance.

## Isolation

For untrusted repos, attachment-heavy tasks, or workflows that pull foreign content:

- use a container, VM, devcontainer, remote sandbox, or equivalent isolated environment
- keep network egress restricted by default
- avoid giving the agent broad access to your home directory or long-lived credentials
- keep production access and personal identities out of the same runtime

The main question is simple:

If this run is compromised, is the blast radius still small?

## Approval Boundaries

`aw-ecc` should be run with clear approval boundaries around:

- unsandboxed shell execution
- network egress
- secret-bearing paths
- writes outside the repo
- workflow dispatch
- deployment actions

Do not treat “the model was instructed to be careful” as a substitute for an enforcement layer.

## Memory and Learnings

Memory is useful and risky at the same time.
Keep it narrow:

- separate project memory from global memory
- avoid storing secrets in memory or learning files
- rotate or discard memory after high-risk or untrusted runs
- do not let foreign content quietly become durable trusted context

If a workflow spends all day reading the open internet, attachments, or untrusted docs, shared long-lived memory should be treated as high risk.

## Config and Supply Chain Hygiene

Treat these as security-sensitive artifacts:

- hooks
- MCP configs
- agent definitions
- skills
- command files
- project-level agent config

Recommended baseline:

```bash
npx ecc-agentshield scan
```

Use AgentShield as a broad baseline for local agent configuration hygiene.
Use the repo's [security-scan](../skills/security-scan/SKILL.md) workflow specifically when you want a repeatable review of Claude Code `.claude/` configuration.

## Proof and Release Discipline

Security posture and proof posture should reinforce each other.

`aw-ecc` should not skip:

- `/aw:verify` before `/aw:deploy`
- deterministic stage artifacts under `.aw_docs/features/<feature_slug>/`
- explicit readiness evidence
- repair loops when verification fails

This is why the proof surface matters:

- safe defaults reduce avoidable risk
- stage artifacts reduce hidden state and unverifiable claims
- verification gates reduce the chance of shipping on intuition alone

For that side of the story, read [aw-ecc-proof-surface.md](./aw-ecc-proof-surface.md).

## Recommended Operating Sequence

For a new team or repo, the smallest responsible path is:

1. start with `core` or `developer`
2. enable only the MCPs needed for the project
3. scan the config surface with AgentShield
4. use isolation for untrusted work
5. keep memory narrow
6. run the normal AW flow and preserve `.aw_docs` artifacts

## Read Next

- [aw-ecc-core-bundle.md](./aw-ecc-core-bundle.md)
- [aw-ecc-install-profiles.md](./aw-ecc-install-profiles.md)
- [aw-ecc-proof-surface.md](./aw-ecc-proof-surface.md)
- [the-security-guide.md](../the-security-guide.md)
