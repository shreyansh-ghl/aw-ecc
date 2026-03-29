---
name: platform-core-aw-plan
description: Creates a detailed, step-by-step implementation plan from an approved spec — with real code blocks, file paths, and 2-5 minute task granularity.
trigger: Spec approved in aw-brainstorm, or user requests an implementation plan for a defined feature.
---

# AW Plan

## Output

Save the plan to `docs/plans/YYYY-MM-DD-<feature>.md`.

## Process

### 1. Research

Before writing the plan:

- **Scan repo** — Read relevant source files, tests, configs. Understand current patterns, naming conventions, and module structure.
- **GitHub search** — Run `gh search code` and `gh search repos` to find existing implementations, templates, and patterns that can be reused or adapted.
- **Read .aw_rules** — Load all applicable `.aw_rules` files for the domains touched by this feature. These are non-negotiable constraints.
- **Check dependencies** — Identify packages, services, or infrastructure that must exist before implementation begins.

### 2. Plan Format

Each task in the plan MUST follow this structure:

```markdown
### Task 1: <descriptive name> [code]

**Files:**
- `src/modules/feature/feature.service.ts` (create)
- `src/modules/feature/feature.service.spec.ts` (create)

**Steps:**
- [ ] Step 1 description (~2 min)
- [ ] Step 2 description (~3 min)
- [ ] Step 3 description (~2 min)

**Implementation:**
\```typescript
// Actual code — no pseudocode, no placeholders
export class FeatureService {
  constructor(private readonly repo: FeatureRepository) {}

  async findByLocationId(locationId: string): Promise<Feature[]> {
    return this.repo.find({ locationId });
  }
}
\```

**Acceptance:**
- [ ] Service returns features filtered by locationId
- [ ] Unit test covers happy path and empty result
```

### 3. Granularity

- Each step should take **2-5 minutes** to execute.
- If a step takes longer, break it down further.
- Each task should be independently executable and verifiable.
- Use checkboxes for progress tracking.

### 4. No Placeholders Rule

The following patterns are **BANNED** in plan code blocks:

| Banned Pattern | What to Write Instead |
|---|---|
| `// TODO: implement` | Actual implementation code |
| `// ... rest of the code` | All remaining code |
| `/* add logic here */` | The actual logic |
| `throw new Error('Not implemented')` | Real error handling or implementation |
| `any` type annotations | Proper TypeScript types |
| `// similar to above` | The actual repeated code |

If you cannot write the real code, the research step was insufficient. Go back and research more.

### 5. Task Types

Tag each task with its type:

- **[code]** — Source code implementation (service, controller, component, etc.)
- **[infra]** — Infrastructure changes (Helm, Terraform, Dockerfile, CI/CD)
- **[docs]** — Documentation updates (README, API docs, architecture docs)
- **[migration]** — Data migration scripts (database schema, data transforms)
- **[config]** — Configuration changes (env vars, feature flags, secrets)

### 6. Self-Review

Before presenting the plan, verify:

- [ ] **Spec coverage** — Every acceptance criterion from the spec has at least one task addressing it.
- [ ] **Placeholder scan** — Zero banned placeholder patterns exist in code blocks.
- [ ] **Type consistency** — All TypeScript types are real, imported, and consistent across tasks.
- [ ] **File path accuracy** — All file paths match the repo's actual directory structure.
- [ ] **Dependency order** — Tasks are ordered so dependencies are created before consumers.
- [ ] **Test coverage** — Every [code] task includes corresponding test files and steps.

## Platform Context

| Domain Signal | Platform Skills to Load |
|---|---|
| NestJS module, service, controller | `platform-services-nestjs-module-structure` |
| DTO, validation, class-validator | `platform-services-dto-validation` |
| MongoDB schema, index | `platform-data-mongodb-patterns` |
| Firestore collection | `platform-data-firestore-patterns` |
| Redis cache, pub/sub | `platform-data-redis-patterns` |
| Vue component, composable | `platform-frontend-vue-development` |
| Helm chart, deployment | `platform-infra-kubernetes-workloads` |
| Terraform resource | `platform-infra-terraform-iac` |
| Worker, queue | `platform-services-worker-patterns` |
| Auth, IAM, guard | `platform-services-authentication-authorization` |

## Next Skill

> After the plan is reviewed and approved, invoke **`aw-execute`** to implement each task.
