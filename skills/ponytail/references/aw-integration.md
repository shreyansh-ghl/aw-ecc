# Ponytail inside the AW SDLC

Ponytail is vendored from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
(MIT, v4.10.0, commit `e3ba2aa`). The six `SKILL.md` bodies are byte-identical to
upstream so they keep their original voice and stay diffable against new releases.
This file is the AW-side layer: precedence, stage wiring, and the GHL answers to
the ladder's platform questions. Provenance and the exact local edits are recorded
in `../vendor-managed-sync.json`.

## Precedence — AW wins

The ladder shortens *how much* gets built. It never overrides these.

1. **`.aw_rules` `[MUST]` rules outrank every rung.** `universal/test-file-exists`,
   `universal/tests-with-behavior-change`, `universal/docs-with-public-change` and
   every `security/*` rule are non-negotiable. Ponytail's own boundary already
   concedes this: *"anything explicitly requested"* and *"input validation at trust
   boundaries, error handling that prevents data loss, security measures,
   accessibility basics"*.
2. **Plan-first outranks rung 1.** "Does this need to exist at all?" applies to the
   *slice inside approved scope*, never to relitigating an approved plan. `aw-build`
   may not reopen planning; a genuine YAGNI finding routes back to `/aw:plan` as a
   scope change, it does not license skipping the artifact.
3. **Root-cause fix means re-slice, not widen.** Ponytail is right that one guard in
   the shared function beats one per caller. In AW that is a *new slice*, because
   "a slice that touches unrelated files is a scope-creep red flag"
   (`aw-build/references/build-increments.md`). Grep the callers, then re-slice.
4. **"Trivial one-liners need no test" does not apply here.** AW classifies a
   behavior change shipped without a test as `HIGH` — release-blocking. Use the
   proportionality already defined in `tdd-workflow` ("When Not to Use": docs-only,
   pure config, scaffolding) instead of the blanket carve-out.
5. **AW's mandated artifacts are explicitly requested output.** The stage contract's
   `Final Output Shape`, `state.json` fields and HTML companions are not the
   "unrequested prose" ponytail trims. Ponytail's own rule exempts them:
   *"Explanation the user explicitly asked for … is not debt, give it in full."*
6. **Chesterton's Fence still gates deletion.** `code-simplification` requires
   understanding why complexity exists before removing it. Ponytail proposes the
   cut; the fence decides. The two skills are complementary, not competing:
   ponytail is pre-write, `code-simplification` is post-green.
7. **Findings need a severity and a fix path.** A ponytail-review finding without
   `severity` + file/line + concrete fix is, by AW's own severity contract, "an
   observation, not a finding" and will be dropped. Simplification findings are
   `MEDIUM`/`LOW` (advisory) unless they also breach a rule.

## Where each skill loads

| Skill | Stage | Moment |
|---|---|---|
| `ponytail` | `/aw:plan` | step 4, before the technical path freezes |
| `ponytail` | `/aw:build` | step 4, "slice the work before editing" — the last pre-edit step |
| `ponytail-review` | `/aw:review` | the "readability and simplicity" axis; also `aw-build` chunk review |
| `ponytail-audit` | standalone | repo-wide sweep, sibling to `improve-codebase-architecture` |
| `ponytail-debt` | standalone | harvests the `ponytail:` markers build leaves behind |
| `ponytail-gain` | standalone | adoption card; benchmark medians only, never per-repo savings |
| `ponytail-help` | standalone | reference card |

Both existing `code-simplification` load points fire *after* code exists ("before
save-pointing", "once a slice is green"). Ponytail's rungs 1-6 are pre-write, which
is why they attach at the slice-selection step instead.

## The deferral loop

AW already requires deferred findings to be written into `execution.md` and
`state.json` with rationale, and `aw-build` carries a mandatory `Simplification`
field. What AW had no convention for is the marker *at the code*. Ponytail supplies
it:

```
# ponytail: global lock, per-account locks if throughput matters
```

`/aw:ponytail-debt` then greps those markers into a ledger and flags any that name
no upgrade trigger as `no-trigger` — the ones that rot silently. Build defers,
the marker records, debt reports, review reads the ledger instead of doing
archaeology.

## Rung 4 and 5, answered for GHL

The ladder asks "does a native platform feature cover it?" and "does an
already-installed dependency solve it?". `platform-native.md` (vendored) answers
that for HTML, CSS, browser APIs, Node, Python and SQL. These are the GHL answers,
and most of them are also `[MUST]` rules — so reaching for the platform primitive
is both the lazy move and the compliant one.

| Reaching for | Use instead | Rule |
|---|---|---|
| `console.log` / a custom logger | `@platform-core/logger` | `backend/no-console-log` |
| hand-rolled auth checks on a route | IAM v2 guards (`@platform-core/iam-v2`) | `security/auth-patterns` |
| `locationId` from body/query/params | the JWT/auth context, server-side | `security/no-client-location-id` |
| a bespoke HTTP client between services | `InternalRequest` / `InternalRequestAsync` (`@platform-core/base-service`) | `api-design/internal-service-communication` |
| a direct Mongo/Firestore driver connection | `@platform-core/*` ORM packages | `data/use-platform-core-orm` |
| a new Firestore collection on the shared default DB | `@platform-core/firestore` + a dedicated module DB | `data/firestore-dedicated-database` |
| `KEYS *` to enumerate cache keys | `SCAN` cursor | `data/redis-scan-not-keys` |
| a cache key with no expiry | `EX`/`PX` on every key | `data/redis-always-ttl` |
| raw HTML where an HL component exists | Highrise `HL*` components | `frontend/highrise-components` |
| hand-written validation in a controller | a typed class-validator DTO | `backend/require-dto-validation` |
| hardcoded user-facing strings | `$t()` / `t()` | `frontend/no-hardcoded-strings` |
| `v-html` on user content | `DOMPurify.sanitize()` first | `frontend/no-vhtml-without-sanitize` |
| a hand-rolled retry/timeout wrapper on a provider call | a typed client/adapter with bounded retry | `backend/external-integration-client-boundary` |
| `any` for external data | `unknown`, validated at the boundary | `universal/no-bare-any` |
| an empty `catch` to keep a diff small | handle, wrap, or rethrow | `universal/no-empty-catch` |

A lazy diff that trips one of these is not lazy, it is a rule violation with fewer
lines. When the platform primitive is genuinely insufficient, say why in the
handoff — that is the rung's "name why each lower rung failed".
