# Accessibility Checklist

Use when `frontend-ui-engineering`, `aw-build`, `aw-test`, or `aw-review` applies to user-facing UI.

## Semantics

- controls use the correct semantic element when possible
- headings, lists, landmarks, and labels describe the structure clearly
- icon-only actions have accessible names
- form inputs are associated with visible or programmatic labels

## Keyboard And Focus

- every interactive control is reachable by keyboard
- focus order matches the visual and logical order
- focus is visible and not trapped unintentionally
- dialogs, drawers, and menus manage focus correctly

## State And Feedback

- loading, error, success, and disabled states are perceivable
- validation errors identify the field and the problem
- dynamic updates are announced when the user would otherwise miss them
- hover-only behavior has an accessible equivalent

## Visual Accessibility

- contrast is sufficient for text and critical UI
- text can scale without breaking the layout
- meaning is not communicated by color alone
- motion respects reduced-motion preferences when relevant

## Responsive And Runtime Proof

- the key flow works at the relevant breakpoints
- zoom and smaller viewport states remain usable
- assistive naming and focus behavior were checked in runtime, not assumed from code alone

## Evidence

- note which accessibility checks were explicitly verified
- mark unverified areas as gaps, not passes
