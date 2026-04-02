# Mode: Code — TDD Execution

## Iron Law

> **Every [code] task follows TDD. No exceptions. No rationalizations.**

## Red-Green-Refactor Cycle

### 1. RED — Write the test first

- Write a failing test that describes the expected behavior.
- Run the test. It MUST fail. If it passes, the test is wrong or the behavior already exists.
- The test defines the contract. Implementation serves the test.

### 2. GREEN — Write minimal code to pass

- Write the simplest implementation that makes the test pass.
- Do not add features, optimizations, or "nice-to-haves" at this stage.
- Run the test. It MUST pass.

### 3. REFACTOR — Clean up without changing behavior

- Extract helpers, rename variables, reduce duplication.
- Run tests after every refactor step. They MUST still pass.
- Stop refactoring when the code is clean and readable.

## Rules

- **Test file per source file** — `feature.service.ts` gets `feature.service.spec.ts`.
- **Descriptive test names** — `it('should return empty array when no features exist for locationId')`.
- **No mocking internals** — Mock boundaries (HTTP, database, external services), not internal functions.
- **Coverage gate** — 80% minimum. Check with `npm run test:cov` or equivalent.
- **No skipped tests** — `it.skip` and `xit` are not allowed in committed code.
- **Platform logger** — Use `@platform-core/logger`, never `console.*`.
- **DTO validation** — Every `@Body()` parameter has a class-validator DTO.
- **Error handling** — Every async call has explicit error handling.

## Rationalization Table

| Rationalization | Why It Is Wrong |
|---|---|
| "I'll write tests after" | You will not. And the code will be shaped for implementation, not testability. |
| "This is too simple to test" | Simple code breaks too. The test documents the contract. |
| "Tests slow me down" | Tests slow you down now. Bugs slow you down forever. |
| "I'll just test the happy path" | Errors happen on unhappy paths. Test both. |
| "The integration test covers it" | Integration tests are slow and broad. Unit tests are fast and precise. |
| "I know this works" | Prove it. Run the test. |
