# Mode: Docs — Write, Review, Commit

## Process

### 1. Write

- Write the documentation in the appropriate location.
- Follow existing documentation style and format in the repo.
- Include code examples where they aid understanding.
- Keep language clear, concise, and direct.

### 2. Self-Review Checklist

Before committing documentation:

- [ ] **Accuracy** — All technical details are correct and verified against the code.
- [ ] **Completeness** — All public APIs, config options, and workflows are documented.
- [ ] **Examples** — Code examples compile/run and match current API signatures.
- [ ] **Links** — All internal links resolve. No broken references.
- [ ] **Formatting** — Consistent heading levels, code block languages, and list styles.
- [ ] **No stale content** — Removed or updated references to deprecated features.
- [ ] **Audience** — Written for the target reader (developer, operator, end user).

### 3. Commit

- Commit documentation changes with `docs:` prefix.
- If docs accompany code changes, include in the same PR.
- Update the table of contents or index if one exists.
