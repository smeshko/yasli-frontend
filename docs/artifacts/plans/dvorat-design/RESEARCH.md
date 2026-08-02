# Research: Migrate frontend to the Дворът visual design

Curated findings from exploration on 2026-08-02. Everything here was verified
against the code or by rendering, not assumed.

## 1. Bulgarian letterforms — the mock's UI face fails

The parent repo's `yasli/docs/design/01-typography-bulgarian-cyrillic.md` makes
Bulgarian `locl` forms
mandatory: Inter ships none, so `<html lang="bg">` (BaseLayout.astro:34)
currently has zero visible effect. The approved Дворът mock used **Golos Text**
for UI and card names.

Rendered `вгдж икпт цщ ю — Детска градина` at 46px in each candidate:

| Face | Bulgarian forms | Verdict |
|---|---|---|
| Sofia Sans | и→u, п→n, т→m, г short — by default | **chosen** |
| IBM Plex Sans | correct via `locl` | viable runner-up, wider |
| Cormorant Garamond | correct — и→u, п→n, т→m | **kept for display** |
| Golos Text | none — identical to Inter | **rejected** |
| Inter | none | current, being removed |

Golos Text is a Russian typeface; its Cyrillic is Russian-default. Keeping it
would have shipped the exact defect the design docs call non-negotiable.
Cormorant Garamond passing was the surprise — it means the display face from
the approved mock survives untouched.

## 2. Contrast — two of three section hues failed AA

Measured against the Дворът grounds (cream `#f4ecdf`, card surface `#fbf6ee`):

| Pair | Ratio | Floor | Result |
|---|---|---|---|
| tomato `#e0503a` small text on cream | 3.33:1 | 4.5 | FAIL |
| moss `#4f7d55` small text on cream | 4.07:1 | 4.5 | FAIL |
| white on tomato chip | 3.90:1 | 4.5 | FAIL |
| cobalt `#2b52c9` small text on cream | 5.68:1 | 4.5 | pass |
| ink `#201c17` on cream | 14.45:1 | 4.5 | pass |
| ink-2 `#5d554a` on card surface | 6.82:1 | 4.5 | pass |

Resolved by darkening to a single value per section, used for graphics and text
alike:

| Token | Value | on cream | on surface | white on it |
|---|---|---|---|---|
| `--color-section-nursery` | `#c7361f` | 4.50:1 | 4.91:1 | 5.28:1 |
| `--color-section-kindergarten` | `#2b52c9` | 5.68:1 | 6.19:1 | 6.66:1 |
| `--color-section-preschool` | `#4a7550` | 4.53:1 | 4.94:1 | 5.31:1 |

## 3. What the tests actually pin

`src/components/SearchResults.test.tsx` renders via `renderToStaticMarkup` and
asserts on **content and one exact tag**, never on class names:

- line 198 — `expect(html).toContain("<h3>ДГ Тест</h3>")`. The card heading
  must stay attribute-free. A `class` on the `h3` breaks this.
- line 197 — `"ДГ Тест (яслена група)"`, the `offering === "infant_group"`
  suffix built in `SearchResults.tsx:145`.
- lines 89, 125-128, 232, 255, 277 — `href`, notice copy, empty-state copy,
  error and stale messages, all matched as substrings.

Everything else is free to change. No test asserts a class name, so the restyle
does not need to touch the suite.

`vitest.config.ts` runs in the `node` environment over `src/**/*.test.{ts,tsx}`.
There is no jsdom and no `@testing-library` — component tests are
server-rendered string assertions only.

## 4. Current visual system being replaced

`src/layouts/BaseLayout.astro` holds every token in one `<style is:global>`:

- ~40 function-named custom properties (`--color-bg-page`, `--color-accent`, …)
  and a full `@media (prefers-color-scheme: dark)` override block.
- Accent `#2563eb` / `#1d4ed8` (light) and `#3b82f6` / `#60a5fa` (dark) — the
  exact indigo/blue the parent's `docs/design/anti-slop-rules.md` rule C1 bans.
- `font-family: Inter, ui-sans-serif, system-ui, …` — no `@font-face`, so Inter
  only ever renders where locally installed; most visitors already get a
  system fallback.
- `--shadow-panel: 0 22px 44px rgba(31,55,88,.12)` — the "floating card" the
  docs call out.
- `body { overflow: hidden }` with `main { overflow-y: auto }` — the page
  scrolls in `main`, not the document. Worth preserving; the hero collapse on
  `[data-has-results]` is tuned against it.

`src/pages/index.astro` carries a 417-line `<style is:global>` for the search
experience. `src/pages/pravila.astro` carries its own ~300-line global block
from line 480. Both redefine spacing rather than importing tokens.

## 5. Repo facts that constrain the work

- `frontend/` is its own git repo (`git@github.com:smeshko/yasli-frontend.git`),
  default branch `main`. The parent `yasli/` directory is **not** a git repo, so
  the plan and all work live in `frontend/`.
- No `AGENTS.md` or `CLAUDE.md` in the frontend repo or the parent directory.
- `docs/artifacts/` did not exist before this plan.
- CI (`.github/workflows`) runs lint, check, test, build — added in `e7848ca`.
- HEAD (`00394e2`, committed 2026-08-02) gated the site nav behind
  `showNav = false` while the приемът copy is reworked. The mobile footer used
  to live inside that nav, so `SiteFooter` now renders once at every width.
- No fonts are self-hosted yet; `public/` contains only `favicon.svg`.
- The approved reference mock is `design-concepts/index.html` in the **parent**
  `yasli/` directory (i.e. `../design-concepts/index.html` relative to this
  repo root), concept `#opt-b`. It is outside version control, so TASK-007
  copies the Дворът concept into a new in-repo `docs/design/`.
- **There is no `docs/design/` in this repo.** `frontend/docs/` contains only
  `ARCHITECTURE.md`. The design research (`DESIGN-SYSTEM.md`,
  `anti-slop-rules.md`, `01`–`05`) lives in the parent `yasli/docs/design/`,
  which is not a git repo — so edits there cannot ship on this branch.
- **`public/favicon.svg` carries the retired identity**: `fill="#2563eb"` and
  `font-family="Inter, system-ui, sans-serif"`. It is served as the favicon and
  rendered as the header brand image at `BaseLayout.astro:45`.
- **`font-synthesis: none` is at `BaseLayout.astro:153`** (`:145` is
  `--shadow-field`). A roman-only Cormorant subset cannot fake the italic the
  design needs.
- **`SearchExperience.tsx` today**: `:254` is a single unsplit
  `<h1 id="search-title">Коя е моята градина?</h1>`; `:299` marks the active
  option with `className={index === activeIndex ? "active" : undefined}`;
  the only `<button>` is the reference-data retry at `:287` — there is no go
  button.
- **Result states need a backend.** `src/lib/api/config.ts` defaults
  `PUBLIC_YASLI_API_BASE_URL` to `http://localhost:8000`. Nothing in this repo
  serves it, so runtime evidence needs the TASK-009 fixture server.

## Useful Commands

```bash
npm run dev      # astro dev on :4321
npm run test     # vitest run
npm run check    # astro check
npm run lint     # eslint
npm run build    # static build to dist/

# contrast check used throughout this plan — the script lives at
# scripts/check-contrast.mjs once TASK-008 lands
node scripts/check-contrast.mjs

# deterministic fixture backend for runtime evidence (TASK-009)
node scripts/fixture-server.mjs   # serves the API contract on :8000

# headless screenshots (no browser extension needed)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --window-size=1440,1200 \
  --virtual-time-budget=8000 --screenshot=out.png "http://localhost:4321/"
```

## Uncertainty

- **Sofia Sans weight coverage** — the mock leans on 400/500/700/800. Resolved
  by self-hosting the variable font, which covers the full 1..1000 axis.
- **Whether the grain overlay costs anything on mobile** — it is a single
  inline SVG data URI on a fixed pseudo-element, no repaint on scroll. Judged
  acceptable; TASK-008 confirms no visible jank.

## References

All three live in the **parent** `yasli/docs/design/`, outside this git repo:

- `01-typography-bulgarian-cyrillic.md` — the Sofia Sans case
- `anti-slop-rules.md` — testable rules, C1 blue ban
- `DESIGN-SYSTEM.md` — advisory direction brief being superseded
- Approved reference: `design-concepts/index.html`, concept `#opt-b` (Дворът)
