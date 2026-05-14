# CONTEXT.md Format

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A concise description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account

## Relationships

- An **Order** produces one or more **Invoices**
- An **Invoice** belongs to exactly one **Customer**

## Example Dialogue

> **Dev:** "When a **Customer** places an **Order**, do we create the **Invoice** immediately?"
> **Domain expert:** "No — an **Invoice** is only generated once a **Fulfillment** is confirmed."

## Flagged Ambiguities

- "account" was used to mean both **Customer** and **User** — resolved: these are distinct concepts.
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others as aliases to avoid.
- **Flag conflicts explicitly.** If a term is used ambiguously, call it out in "Flagged Ambiguities" with a clear resolution.
- **Keep definitions tight.** One sentence max. Define what it IS, not what it does.
- **Show relationships.** Use bold term names and express cardinality where obvious.
- **Only include terms specific to this project's context.** General programming concepts do not belong even if the project uses them extensively.
- **Update inline.** When a term is resolved during planning, record it while the decision is fresh.

## Multi-Context Repos

If a repo has multiple contexts, prefer one `CONTEXT.md` per context and a root `CONTEXT-MAP.md` that points to each context. Keep shared vocabulary in the root only when the same meaning is truly shared.

Example:

```md
# Context Map

- Ordering: `src/ordering/CONTEXT.md`
- Billing: `src/billing/CONTEXT.md`
- Shared system decisions: `docs/adr/`
```

## What Not To Include

- Implementation details that will churn with refactors
- Generic framework vocabulary
- Unresolved terms without a flagged ambiguity
- Business facts that belong in a PRD or spec rather than the glossary
