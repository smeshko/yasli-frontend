# TASK-008: Final Validation

Depends on: all prior tasks
Suggested commit: `Validate the Дворът migration`

## Goal

Prove every PLAN acceptance criterion with reproducible evidence, criterion by
criterion — not with a catch-all smoke test.

## Files

- `scripts/check-contrast.mjs` — new: computes WCAG ratios for the complete
  inventory of shipped text/background pairs and exits non-zero on any failure

## Gates

- [ ] All task checkboxes in `PLAN.md` are ticked
- [ ] `npm run lint` passes
- [ ] `npm run check` passes
- [ ] `npm run test` passes, and `git diff main -- 'src/**/*.test.*'` is empty
      (no assertion was edited to accommodate the restyle)
- [ ] `npm run build` succeeds; `dist/fonts/` contains the self-hosted woff2,
      including the Cormorant italic
- [ ] `node scripts/check-contrast.mjs` exits 0. It must enumerate every
      shipped pair — ink/cream, ink-muted/surface, each of the three section
      hues on cream and on surface, white on each hue, placeholder on the
      field, footer link on cream, note text on each note tint — not just the
      three headline hues

## Criterion-to-evidence matrix

Run `npm run fixtures` (TASK-009) alongside `npm run dev`, then capture each
row. Scenario ids are defined in `SCENARIOS.md`.

| PLAN criterion | Scenario / check | Evidence |
|---|---|---|
| No third-party font requests | any page, DevTools network filtered to `fonts.` | network panel screenshot showing zero `googleapis`/`gstatic` rows |
| Bulgarian letterforms everywhere | `/`, `/pravila`, 404 | screenshot of `вгдж икпт цщ ю` on each |
| True italic `моята` | `/` idle | network row for the italic woff2 + zoomed headline screenshot |
| No retired colours/fonts | `grep -rn "2563eb\|1d4ed8\|3b82f6\|60a5fa\|Inter" src/ public/` | empty output |
| Favicon on new palette | browser tab + header brand | screenshot |
| Palette meets AA | `node scripts/check-contrast.mjs` | full pass table |
| Autocomplete: mouse | S1 | screenshot of open panel with a hovered row |
| Autocomplete: ArrowDown/ArrowUp | S1 | two screenshots showing the active row moving |
| Autocomplete: Enter selects | S1 | results screenshot after Enter |
| Autocomplete: Escape closes | S1 | screenshot of closed panel, query retained |
| No-match state | type `щщщ` | screenshot of `Няма точен адрес…` |
| All three groups populated | S1 | full results screenshot |
| Preschool empty state | S2 | screenshot |
| Nursery empty state + district fallback | S3 | screenshot showing both |
| Kindergarten empty state | S4 | screenshot |
| Missing-district notice | S5 | screenshot |
| Stale banner | S6 | screenshot |
| Error + retry state | S7 | screenshot |
| Stale-address state | S8 | screenshot |
| Freshness line | S1 | screenshot of the dated line |
| Filters switch groups | S1 | one screenshot per filter (4) |
| sessionStorage persistence | S1, then reload | screenshot after reload showing results restored |
| Reduced motion honoured | S1 with `--force-prefers-reduced-motion` | screenshot with no entry animation |
| Pages consistent at 1440 and 390 | `/`, `/pravila`, 404 | 6 screenshots |
| `showNav` still false | `grep -n "const showNav" src/layouts/BaseLayout.astro` | shows `= false` |
| In-repo docs describe Дворът | `docs/design/` | rendered docs + reference html |

## Steps

- [ ] Write `scripts/check-contrast.mjs` with the full pair inventory
- [ ] Start `npm run fixtures` and `npm run dev`
- [ ] Walk the matrix top to bottom, saving each artefact
- [ ] Tick each PLAN acceptance criterion only once its row has produced its
      artefact
- [ ] Record anything that could not be demonstrated, and why, in `VALIDATION.md`

## Notes

A passing `npm run build` proves the code compiles, not that the design is
correct. Every visual criterion needs an artefact from a running server.

If a criterion cannot be demonstrated, say so explicitly rather than ticking it
— an unverified criterion is a finding, not a formality.
