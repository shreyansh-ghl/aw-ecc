# Baseline PR

## Title
fix(desktop-customizer): handle BUILD_FAILED status in save handler (#7894)

## Problem Summary
This shipped change addressed work around `desktop-customizer` in RevEx frontend.

## Baseline Route Expectation
- route: `/aw:investigate`
- primary skill: `aw-investigate`
- recommended supporting skills: `frontend-ui-engineering`, `browser-testing-with-devtools`, `documentation-and-adrs`
- comparison mode: `pr_parity`

## Changed Files
- `apps/desktop-customizer/src/components/AppIconPreview.vue` (+1 / -1)
- `apps/desktop-customizer/src/components/CropperModal.vue` (+2 / -2)
- `apps/desktop-customizer/src/components/DesktopCustomizerApp.vue` (+7 / -3)
- `apps/desktop-customizer/src/components/ImageUploader.vue` (+2 / -1)
- `apps/desktop-customizer/src/components/InputForm.vue` (+7 / -7)
- `apps/desktop-customizer/src/components/LivePreview.vue` (+4 / -4)
- `apps/desktop-customizer/src/components/PreviewHighlightZone.vue` (+2 / -1)
- `apps/desktop-customizer/src/components/PreviewPanel.vue` (+1 / -1)
- `apps/desktop-customizer/src/composables/useValidation.ts` (+2 / -2)
- `apps/desktop-customizer/src/helper/BrandedApp.helper.ts` (+3 / -9)

## Diff Summary
- files changed: 11
- insertions: 35
- deletions: 39

## Validation Clues
- no explicit test-file changes were visible in the shipped baseline

## Risk Notes
- baseline removed or simplified existing code paths

## Baseline Commit
- repo: `revex-frontend`
- sha: `ba06054b6f3333f117e9aed0048c2a4f9e4a5ab4`
- parent: `6118374b9f0a8c36b141c34a3dfbccd6c6fbe30d`
- date: `2026-04-02T15:36:43+05:30`