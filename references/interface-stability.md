# Interface Stability

Use when APIs, events, configs, contracts, or shared types change.

## Rules

- prefer addition over breaking modification
- validate at boundaries
- keep error semantics predictable
- name compatibility impacts explicitly

## GHL Notes

- shared contracts across MFAs, services, or workers need extra care
- event payload and tenant-scoping changes should be treated as high-risk
- versioned deploy surfaces make hidden contract drift costly

## Review Questions

- who depends on this contract today
- what breaks if a caller relied on current behavior
- is a compatibility layer or feature flag safer than direct replacement
