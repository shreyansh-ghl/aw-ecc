---
name: frontend-ui-engineering
description: Builds production-quality UI with design-system compliance, accessibility, responsive behavior, and runtime proof. Use when implementing or changing user-facing interfaces.
origin: ECC
---

# Frontend UI Engineering

## Overview

Frontend work is not "just make the UI appear."
This skill treats design quality, accessibility, responsive behavior, interaction states, and runtime verification as part of the implementation itself.

## When to Use

- building new pages, components, forms, or flows
- modifying existing user-facing UI
- implementing interaction changes or responsive layouts
- touching design-system components, page structure, or frontend state

**When NOT to use**

- backend-only or non-UI work
- pure documentation updates with no user-facing surface

## Workflow

1. Load the visual and product constraints first.
   Start with approved design artifacts, design-system rules, component conventions, and relevant UI standards.
2. Define the required states.
   Name the happy path, loading, empty, error, disabled, and responsive states before writing polish code.
3. Build structure before ornament.
   Implement semantic layout, component boundaries, and state flow first.
   Visual detail should reinforce the structure, not compensate for a weak structure.
4. Treat accessibility as a first-class requirement.
   Use `../../references/accessibility-checklist.md` and `../../references/frontend-quality-checklist.md`.
   Keyboard support, focus behavior, labels, semantics, and contrast are part of done.
5. Pair UI work with proof.
   Use `../../references/testing-patterns.md` for behavior tests and runtime evidence.
   For complex UI or interaction work, verify the behavior in a browser, not just in code.
6. Check responsive behavior intentionally.
   Confirm the key flow still works across the relevant viewport sizes and input states.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The UI compiles, so it's basically done." | Compilation does not prove usable layout, accessibility, or runtime behavior. |
| "Accessibility can come later." | Retrofitting accessibility after the structure is baked is slower and riskier. |
| "Desktop is enough for now." | Responsive breakage is still product breakage. |
| "The design system will cover everything automatically." | Design systems reduce mistakes, but they do not remove the need for state, layout, and interaction judgment. |

## Red Flags

- no explicit state model for loading, empty, or error cases
- browser/runtime proof is missing for meaningful interaction changes
- design tokens or system components are bypassed without reason
- accessibility is mentioned vaguely instead of checked concretely

## Verification

After frontend implementation, confirm:

- [ ] required states are implemented, not implied
- [ ] the UI respects the active design system and conventions
- [ ] accessibility checks were applied deliberately
- [ ] the key flow works responsively at the relevant breakpoints
- [ ] runtime or browser evidence exists for meaningful interaction changes
