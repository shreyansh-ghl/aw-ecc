# Deprecation And Migration

Use when replacing contracts, removing code paths, or changing operational expectations.

## Rules

- code is liability unless it still serves a live need
- removal needs a migration story, not just a diff
- keep compatibility windows explicit
- delete zombie code only when the dependency picture is clear

## GHL Notes

- shared package, event, MFA, and service contract removals need extra caution
- versioned deploy systems can hide long-tail consumers, so verify before deleting
