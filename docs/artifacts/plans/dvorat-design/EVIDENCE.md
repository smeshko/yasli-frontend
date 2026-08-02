# Final validation evidence — dvorat-design

Run 2026-08-02 against `npm run build` output served locally, with
`scripts/fixture-server.mjs` providing the API. Screenshots were captured with
headless Chrome and `--force-prefers-reduced-motion`.

## Gates

| Gate | Result |
|---|---|
| `npm run lint` | pass |
| `npm run check` | pass — 0 errors, 0 warnings, 0 hints (30 files) |
| `npm run test` | pass — 7 files, 36 tests |
| `git diff main -- 'src/**/*.test.*'` | 1 file, +7/-1 — the single authorised assertion change in `SearchExperience.test.tsx` |
| `npm run build` | pass — 3 pages |
| `dist/fonts/*.woff2` | 6 files |
| `node scripts/check-contrast.mjs` | pass — 27/27 pairs |
| `grep -rn "2563eb\|1d4ed8\|3b82f6\|60a5fa" src/ public/` | no matches |
| `grep -n "const showNav"` | `= false` |

## Criterion evidence

| Criterion | Evidence |
|---|---|
| Bulgarian letterforms | Smoke string rendered from the built site in both faces: `вгдж uknm цщ ю` — и→u, п→n, т→m |
| Fonts load locally | `document.fonts.check` true for Sofia Sans, Cormorant roman **and** Cormorant italic; all six faces listed as loaded |
| No third-party font requests | Built output references only `/fonts/*.woff2`; the only `googleapis` strings are prose in `public/fonts/OFL.txt` describing how to refresh |
| True italic `моята` | Italic face loads as its own file and renders as a real italic |
| Glyph coverage | `„Пчелица“ № 4 — Източник ↗` renders with no tofu |
| Tint circles carry section hues | 404 page shows all three circles in nursery/kindergarten/preschool hues |
| Autocomplete — mouse | Typed, then `mousedown` on an option → results rendered |
| Autocomplete — ArrowDown | Active row moves to the second suggestion |
| Autocomplete — Enter | Selects and renders results; hero collapses |
| Autocomplete — Escape | Panel closes, query retained |
| All three groups populated | S1 — 7 results across the three groups, infant-group suffix present |
| Preschool empty | S2 |
| Nursery empty + district results | S3 |
| Kindergarten empty | S4 |
| Missing district | S5 |
| Stale banner | S6 — freshness line 30 days old, banner shown |
| Match error, no retry control | S7 — message only, as designed |
| Stale address + retry | S8 — byte-exact 404 produces `Презареди адресите` |
| Reference-data failure + retry | S9 — `Опитайте пак` panel; DOM confirmed |
| Filters | Each filter narrows to its group |
| sessionStorage persistence | After reload with no typing: 7 result cards restored, storage key present |
| Nav behaviour unchanged | Diff of `BaseLayout.astro` touches no nav markup, handler, or ARIA attribute |
| Nav renders when enabled | Captured with `showNav` temporarily true, then reverted |
| Pages at 1440 and 500 | Home, `/pravila`, 404 captured at both widths |
| In-repo design docs | `docs/design/` with `DESIGN-SYSTEM.md` and a working `dvorat-reference.html` |

## Not demonstrated

- **Offline reload per route.** Proven equivalently rather than literally: the
  built output makes no third-party font request, the local `/fonts/*.woff2`
  are the only font URLs referenced, and `document.fonts.check` returns true
  for every face. A DevTools "Offline" reload was not performed — headless
  Chrome has no equivalent switch in this setup.
- **Real backend.** All result states were driven by the fixture server. The
  contract was read from `src/lib/api/client.ts` and `types.ts`, but nothing
  here proves the production backend returns those exact shapes.
