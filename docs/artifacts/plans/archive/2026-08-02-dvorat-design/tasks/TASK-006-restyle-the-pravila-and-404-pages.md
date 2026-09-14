# TASK-006: Restyle the pravila and 404 pages

Depends on: TASK-002
Suggested commit: `Restyle pravila and 404 on the new system`

## Goal

Bring the two secondary pages onto Дворът so the site is visually consistent
end to end.

## Files

- `src/pages/pravila.astro` — its ~300-line global style block from line 480
- `src/pages/404.astro` — inherits `.section-stack`, `.button`, `h1`

## Acceptance

- [ ] `pravila.astro` uses BaseLayout tokens; no page-local colour literals
- [ ] Long-form body copy sits at a comfortable measure (60–75ch) in the UI face
- [ ] `.cycle-banner`, `.tldr-grid`/`.tldr-card`, `.info-details`/`summary` and
      the eyebrow are all restyled to the riso register
- [ ] `<details>` summaries have a visible focus ring and an obvious affordance
- [ ] External portal links are distinguishable without relying on colour alone
- [ ] 404 renders correctly with the restyled `.button`
- [ ] Both pages are correct at 1440px and 390px
- [ ] `npm run check`, `npm run lint`, `npm run build` pass

Evidence: full-page screenshots of `/pravila` and a 404 route at both widths.

## Steps

### RED
- [ ] Screenshot both pages as the before-state

### GREEN
- [ ] Replace the page-local palette with token references
- [ ] Restyle the banner, TL;DR cards and details blocks
- [ ] Restyle `.section-stack`, `.eyebrow`, `.button` for 404

### REFACTOR
- [ ] Hoist anything shared with the home page into BaseLayout instead of
      duplicating it here

## Notes

This is the largest single file in the migration. The copy is accurate and
must not change — including the 296,55 EUR / 580 лв. figure and the ПМС 76/2021
reference.
