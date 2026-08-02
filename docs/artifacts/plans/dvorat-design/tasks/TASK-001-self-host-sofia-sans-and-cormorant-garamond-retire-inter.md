# TASK-001: Self-host Sofia Sans and Cormorant Garamond, retire Inter

Depends on: None
Suggested commit: `Self-host Sofia Sans and Cormorant Garamond`

## Goal

Ship both typefaces from `public/fonts/` so Bulgarian letterforms render
correctly with no third-party request, and remove Inter from the stack.

## Files

- `public/fonts/` — new: woff2 files, Latin + Cyrillic subsets only.
  Four faces: Sofia Sans roman, Cormorant Garamond roman, **Cormorant Garamond
  italic**, and Sofia Sans italic only if a use appears (none today).
- `public/fonts/OFL.txt` — new: SIL Open Font License text for both families
- `src/layouts/BaseLayout.astro` — `@font-face` blocks; `font-family` swapped
  off Inter; `font-synthesis: none` kept

## Acceptance

- [ ] `вгдж икпт цщ ю` renders with Bulgarian forms (и→u, п→n, т→m, г short)
      in Sofia Sans, and the Cormorant display face renders its Bulgarian forms
- [ ] Both families render with DevTools network throttled to offline — no
      request to `fonts.googleapis.com` or `fonts.gstatic.com`
- [ ] `„ “ № ↗ —` all render (not tofu) from the subset files
- [ ] A **separate italic Cormorant face** is declared with
      `font-style: italic` and loads as its own file. `font-synthesis: none`
      (`BaseLayout.astro:153`) means a roman-only subset would silently render
      `моята` upright — the network panel must show the italic woff2 fetched
- [ ] `grep -ri "inter" src/` returns no font-stack hit
- [ ] `npm run build` succeeds and copies the fonts into `dist/fonts/`

Evidence: headless screenshot of the smoke string at 46px in both faces served
from `localhost:4321`, plus the network panel / `--dump-dom` output showing no
external font request, plus `ls dist/fonts/` after a build.

## Steps

### RED
- [ ] Add the smoke string to a scratch route (or reuse the home hero) and
      capture a screenshot showing the *current* Inter/system rendering with
      Russian letterforms — this is the before-state the task must change

### GREEN
- [ ] Fetch Sofia Sans and Cormorant Garamond variable woff2 (SIL OFL) —
      **including the Cormorant italic** — subset to `latin` + `cyrillic`,
      drop `latin-ext`/`greek`/`vietnamese`
- [ ] Write `@font-face` with `font-display: swap`, correct `unicode-range`,
      and variable `font-weight` ranges
- [ ] Point `--font-ui` at Sofia Sans and `--font-display` at Cormorant
      Garamond; drop Inter from the stack, keep a system fallback chain
- [ ] Re-capture the smoke string and confirm the letterforms changed

### REFACTOR
- [ ] Add `<link rel="preload">` for the one font file used above the fold
- [ ] Record each file's origin and licence in `public/fonts/OFL.txt`

## Notes

Sofia Sans ships Bulgarian Cyrillic as its *default* glyph set — no
`font-feature-settings: "locl"` is required. Adding `"locl" 1` anyway is
harmless and documents intent for any future face swap.

Keep `font-synthesis: none` (`BaseLayout.astro:153` — line 145 is
`--shadow-field`). With a variable font the browser must never fake a weight,
which is exactly why the italic has to be a real file.
