# Mode: Migration — Staged Rollout

## Process

### 1. Script

- Write the migration script. It MUST be **idempotent** — running it twice produces the same result.
- Use `up()` and `down()` functions (or equivalent) for forward and rollback.
- Include validation checks that confirm the migration was applied correctly.
- Test the migration against a copy of production data (or realistic test data).

### 2. Rollback

- Every migration MUST have a rollback path.
- Write the rollback script before applying the migration.
- Test the rollback independently.
- Document the rollback procedure in the migration file header.

### 3. Validate

- Run the migration in a test/staging environment first.
- Verify data integrity after migration.
- Check that dependent queries still work with the new schema.
- Confirm indexes are in place before queries execute.

### 4. Commit

- Commit migration files with `migration:` or `feat:` prefix.
- Include the rollback script in the same commit.
- Document the migration in the PR description.

## Rules

### Indexes

- **Deploy indexes BEFORE** deploying schema or query changes that use them.
- Use `background: true` for index creation (or rely on MongoDB 4.2+ default).
- Add compound indexes for multi-field queries — avoid multiple single-field indexes.
- Scope all MongoDB queries by `locationId` (compound index required).

### Fields

- New fields MUST have default values or be nullable — never break existing documents.
- Remove fields in two phases: (1) stop writing, (2) remove after migration window.
- Never rename fields in a single migration — add new, migrate data, remove old.

### Secrets

- Never store secrets in migration scripts.
- Use environment variables or GCP Secret Manager for connection strings.
- Never log sensitive data during migration (PII, credentials, tokens).

### Data Safety

- Back up the collection/table before running destructive migrations.
- Use transactions where available for multi-document updates.
- Set reasonable batch sizes for bulk operations — avoid OOM.
- Log progress for long-running migrations (every N records).
