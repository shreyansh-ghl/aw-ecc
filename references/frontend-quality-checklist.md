# Frontend Quality Checklist

Use when `platform-frontend:*` or `platform-design:*` applies.

## Design System

- HighRise-first components when the surface already uses HighRise
- no unnecessary raw HTML or ad hoc replacement of established primitives
- spacing, typography, and states match existing product patterns

## Accessibility

- keyboard path works
- focus is visible
- labels and roles are explicit
- errors are not color-only
- responsive layouts remain readable at mobile widths

## Runtime Proof

- primary flow tested in the browser
- desktop and mobile evidence captured when the change affects layout
- loading, error, empty, and success states are represented
- no hardcoded strings when i18n standards apply

## GHL Notes

- load `platform-frontend:highrise-configuration` before deep UI implementation
- use `platform-design:review` and `platform-frontend:a11y-review` during review when applicable
