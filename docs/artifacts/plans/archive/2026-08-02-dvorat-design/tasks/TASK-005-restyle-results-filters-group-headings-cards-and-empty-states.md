# TASK-005: Restyle results: filters, group headings, cards and empty states

Depends on: TASK-004, TASK-009
Suggested commit: `Restyle result groups and cards`

## Goal

Put the results on the new system: pill filters, Cormorant group headings with
a count chip and a coloured rule, riso cards, and the three empty states.

## Files

- `src/pages/index.astro` — `.filters`, `.result-group`, `.result-card`,
  `.group-note`, `.empty-group`, `.stale-banner`, `.results-status` styles
- `src/components/SearchResults.tsx` — add the per-group `data-kind` hook and
  the card index numeral; **no change to the `<h3>`**

## Acceptance

- [ ] Each group carries `data-kind="nursery|kindergarten|preschool"` and picks
      its hue from that, via a single `--tone` custom property
- [ ] Group heading is Cormorant with a filled count chip and a 3px rule in the
      group hue
- [ ] Cards are the cream surface with a 2px ink border, 16px radius and a 5px
      hard offset shadow; hover lifts and shifts the shadow to the group hue
- [ ] Card institution name is Sofia Sans 700 at ~1.06rem — **not** a serif
- [ ] The outline index numeral sits behind the card content and never overlaps
      the name at any width
- [ ] `<h3>` stays attribute-free — `SearchResults.test.tsx:198` passes unedited
- [ ] `(яслена група)` suffix still renders for `offering === "infant_group"`
- [ ] Nursery note, district-fallback note and missing-district note all render
      with the correct tint and copy
- [ ] All three empty-state strings render in the dashed empty block
- [ ] Stale banner and the error/stale result states are restyled
- [ ] Cards animate in staggered, and not at all under reduced motion
- [ ] `npm run test` passes with zero assertion edits

Evidence: screenshots of scenarios S1, S2, S3, S5 and S6 (see
`../SCENARIOS.md`) taken against the TASK-009 fixture server, plus
`npm run test` output. The fixture server must be running — result states are
not otherwise reproducible.

## Steps

### RED
- [ ] Run `npm run test` and record the current pass count as the baseline

### GREEN
- [ ] Add `data-kind` to the group `<section>` and map it to `--tone`
- [ ] Restyle filters, group heading, rule and count chip
- [ ] Restyle the card, its kind label, basis line and source link
- [ ] Restyle notes, empty block, stale banner and status rows
- [ ] Re-run the suite; if anything fails, fix the markup, not the assertion

### REFACTOR
- [ ] Collapse the three per-kind colour rules into one `--tone` lookup

## Notes

`SearchResults.tsx:145` builds the display name by string concatenation. Leave
that logic alone — the test matches the exact output.

`deriveResultGroupState` drives which notes show. Presentation only; do not
touch the logic in `src/lib/search/results.ts`.
