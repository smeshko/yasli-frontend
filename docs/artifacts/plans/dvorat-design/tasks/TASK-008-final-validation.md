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

- [ ] Every **prior** task is ticked in `PLAN.md` (TASK-001 through
      TASK-007 and TASK-009). This task is the last to be ticked
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

Scenario selection is read at startup, so S6-S9 each need their own server
restart:

```bash
FIXTURE_SCENARIO=S1 npm run fixtures   # S1-S5
FIXTURE_SCENARIO=S6 npm run fixtures   # stale banner
FIXTURE_SCENARIO=S7 npm run fixtures   # match error
FIXTURE_SCENARIO=S8 npm run fixtures   # address_not_found
FIXTURE_SCENARIO=S9 npm run fixtures   # reference-data failure
```

| PLAN criterion | Scenario / check | Evidence |
|---|---|---|
| No third-party font requests | **each** of `/`, `/pravila`, 404 — DevTools network, no filter | three screenshots showing zero `googleapis`/`gstatic` rows **and** the local `/fonts/*.woff2` rows actually fetched. Absence of remote rows alone does not prove the local files are the ones in use |
| Fonts work offline | reload each route with the network blocked (DevTools Offline, service-worker-free) | three screenshots rendering in Sofia Sans / Cormorant, not a system fallback. Confirm via `getComputedStyle(document.body).fontFamily` and `document.fonts.check("1em 'Sofia Sans'")` in the console |
| Bulgarian letterforms everywhere | `/`, `/pravila`, 404 | the smoke string is not page content, so inject it reproducibly per route: `document.title=''; document.body.insertAdjacentHTML('afterbegin','<p id=smoke style="font:46px Sofia Sans">вгдж икпт цщ ю</p>')` in the console, screenshot, then reload to discard. Repeat with `Cormorant Garamond`. `git status` must be clean afterwards — nothing is edited on disk |
| True italic `моята` | `/` idle | network row for the italic woff2 + zoomed headline screenshot |
| No retired colours/fonts | `grep -rn "2563eb\|1d4ed8\|3b82f6\|60a5fa\|Inter" src/ public/` | empty output |
| Favicon on new palette | browser tab + header brand | screenshot |
| Palette meets AA | `node scripts/check-contrast.mjs` | full pass table |
| Autocomplete: mouse | S1 | three screenshots: panel open, row under the cursor, and the results rendered **after clicking** it — a hover shot alone does not exercise selection |
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
| Match error state | S7 | screenshot of the error message; note that this state has no retry control by design |
| Stale-address state + retry | S8 | screenshot showing the `Презареди адресите` button; then click it and capture the **network panel** showing fresh `/api/streets` and `/api/addresses` requests. Note: `retryReferences` reloads reference data and deliberately leaves `matchState` as `stale`, so the panel looks unchanged — a second screenshot of the same panel proves nothing. Restart the server on S1 and reselect the address to capture recovery |
| Reference-data failure + retry | S9 | screenshot of the `Опитайте пак` panel; click it and capture the suggestions repopulating (S9 serves 500 once, then 200) |
| Freshness stays fresh in baseline scenarios | S1 | screenshot showing the freshness line **without** the stale banner, proving the fixture timestamps are startup-relative rather than aged |
| Freshness line | S1 | screenshot of the dated line |
| Filters switch groups | S1 | one screenshot per filter (4) |
| sessionStorage persistence | S1, then reload | screenshot after reload showing results restored |
| Reduced motion honoured | S1 with `--force-prefers-reduced-motion` | screenshot with no entry animation |
| Pages consistent at 1440 and 390 | `/`, `/pravila`, 404 | 6 screenshots |
| Nav unchanged in behaviour | `git diff main -- src/layouts/BaseLayout.astro` reviewed for the nav block | the diff touches only styles — no change to `navItems`, the toggle handler, `aria-expanded`/`aria-label` updates, or the Escape listener |
| `showNav` still false | `grep -n "const showNav" src/layouts/BaseLayout.astro` | shows `= false` |
| Nav renders correctly when enabled | flip `showNav` to `true` locally, screenshot desktop + 390px, then revert | two screenshots + `git diff` confirming the flag is back to `false` |
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
