# Plan: Migrate frontend to the Дворът visual design

Status: in-progress
Branch: feat/dvorat-design
Risk: medium
Epic: none
Phase: none
Linear: none
Created: 2026-08-02

## Goal

Replace the frontend's generic Inter/blue visual system with **Дворът** — the
risograph neighbourhood-guide direction approved on 2026-08-02 — across every
page, without changing a single behaviour, ARIA contract or keyboard path.

## Scope

- Self-hosted **Sofia Sans** (UI, card names) and **Cormorant Garamond**
  (display) replacing the Inter stack. Latin + Cyrillic subsets only.
- New token set in `src/layouts/BaseLayout.astro`: cream `#f4ecdf` ground with
  an SVG grain overlay, ink `#201c17`, hard offset shadows, two-value radius
  scale, and three section hues used as both graphics and text.
- The three background circles are tinted with the same three section hues, so
  they read as a key to the result grouping rather than decoration.
- Restyle of `index.astro` (hero, search field, suggestion panel, results),
  `SearchResults.tsx` (filters, group headings, cards, notes, empty states),
  `SiteFooter.astro`, `pravila.astro`, `404.astro`.
- Replacement of `public/favicon.svg`, which today carries `#2563eb` and
  `font-family="Inter"` and doubles as the header brand image
  (`BaseLayout.astro:45`). The retired palette ships on every page until it goes.
- Two narrowly-scoped markup changes in `SearchExperience.tsx`, authorised here
  because the design cannot be reached with CSS alone:
  (a) wrapping words of the H1 so `моята` can be italic and `градина`
  underlined, and (b) adding a `data-active` attribute alongside the existing
  `className="active"` on the active option. Both are additive; the
  `role="option"` / `aria-selected` / keyboard contract is untouched.
- A new in-repo `docs/design/` holding the shipped direction and the approved
  reference, so the design system travels with the code (see Out of Scope).
  Its input is versioned with this plan at
  `docs/artifacts/plans/dvorat-design/assets/approved-concepts.html` — the
  parent workspace is not available to a clean checkout.

## Out of Scope

- Any change to search, matching, freshness, persistence or API behaviour.
- Unhiding the site nav. `showNav = false` (BaseLayout.astro:22) stays false;
  the nav markup is restyled but stays gated.
- Dark mode. See Decisions — the current `prefers-color-scheme: dark` block is
  removed, not ported.
- New content or copy. Every Bulgarian string ships unchanged.
- The other two concepts (Шевица, Първи ден). Not implemented, not kept.
- Editing the advisory design docs in the **parent** `yasli/docs/design/`.
  That directory is outside this git repo, so changes there cannot ship on this
  branch. The superseding direction is written into a new in-repo
  `frontend/docs/design/` instead; the parent copies stay as historical
  research.
- Adding a submit/go button to the search field. The reference mock draws one,
  but the live component has never had it and selection is already handled by
  click and Enter. Adding a control is a behaviour change, not a restyle.

## Research Summary

See [RESEARCH.md](./RESEARCH.md). The three findings that shaped this plan:

1. **Golos Text — the mock's UI face — renders Russian letterforms**, pixel
   identical to Inter. Verified by rendering `вгдж икпт цщ ю` in all candidates.
   This is the exact defect `docs/design/01-typography-bulgarian-cyrillic.md`
   calls mandatory to fix, so the approved mock could not ship as drawn.
   Cormorant Garamond, unexpectedly, *does* ship Bulgarian forms and is kept.
2. **Two of the three section hues failed WCAG AA as small text on cream** —
   tomato `#e0503a` at 3.33:1 and moss `#4f7d55` at 4.07:1 against a 4.5:1
   floor. Darkened to `#c7361f` and `#4a7550`; cobalt `#2b52c9` passed as-is.
3. **`SearchResults.test.tsx:198` asserts `<h3>ДГ Тест</h3>` verbatim.** The
   card heading must stay attribute-free — styled by descendant selector only.

## Decisions

- **Sofia Sans replaces Golos Text.** Bulgarian Cyrillic is its *default*
  glyph set, so `lang="bg"` finally has visible effect with no
  `font-feature-settings` hacks. It is also the documented recommendation in
  `docs/design/01`, is OFL, variable, and self-hostable.
- **One value per section hue, used for both graphics and text**, rather than a
  graphic/text tint pair. Fewer tokens, no ambiguity about which to reach for,
  and all three pass AA at every use (small text on cream ≥4.50:1, on the card
  surface ≥4.91:1, white on chip ≥5.28:1). The circles read slightly deeper
  than the first mock; this was accepted.
- **Dark mode is dropped, not ported.** Дворът is a committed light,
  paper-stock design — cream ground, ink, grain, hard shadows. A dark variant
  would be a second design, not a translation of this one. `color-scheme` is
  pinned to `light`. Rejected alternative: auto-inverting the palette, which
  destroys the riso character the direction was chosen for.
- **Дворът supersedes the conflicting parts of `docs/design/`.** The testable
  rules that survive stay binding (contrast floor, Bulgarian `locl`,
  function-named tokens, `prefers-reduced-motion`, no Inter, no unmotivated
  blue). Two rules are explicitly superseded and recorded as deliberate: the
  hard offset shadow is a risograph print device, not elevation; and 700 on
  card names is the approved hierarchy, not body weight.
- **The approved reference is vendored into the plan, not referenced in place.**
  `assets/approved-concepts.html` is the immutable input; the parent
  `design-concepts/` directory is a working file that a fresh clone will not
  have.
- **Cards keep a bare `<h3>`.** Styling goes on `.result-card h3`. This is what
  keeps the existing suite green without editing assertions.
- **Class names are kept** where they already exist (`.result-card`,
  `.search-field`, `.filters`, …). This is a restyle, not a rename; it keeps
  the diff readable and the tests untouched.

## Risks

- **Font subsetting drops a needed glyph** — Bulgarian quotation marks („ “),
  №, ↗ and the Cyrillic range must survive. Mitigation: TASK-001 verifies the
  full smoke string renders from the local files with the network blocked.
- **`pravila.astro` is 777 lines with its own 300-line global style block** and
  is the largest single restyle surface. Mitigation: it gets its own task, and
  its tokens come from BaseLayout rather than being redefined.
- **Silent visual regression on a page nobody screenshots.** Mitigation: the
  final task captures every page at desktop and mobile, plus each result state.
- **`color-mix()` support.** Used for the note tints in the mock. Mitigation:
  resolve to static hex values at author time — no runtime dependency.
- **Every result state depends on a backend this repo does not contain.**
  `PUBLIC_YASLI_API_BASE_URL` defaults to `http://localhost:8000`, so
  screenshots of results, empty groups and fallbacks would otherwise depend on
  whatever data a local Postgres happens to hold. Mitigation: TASK-009 adds a
  deterministic fixture server with fixed scenario addresses, and TASK-008
  maps each acceptance criterion to a named scenario.
- **The italic display face is load-bearing.** `моята` is italic Cormorant and
  `font-synthesis: none` (`BaseLayout.astro:153`) forbids a synthesised
  oblique, so a roman-only subset silently ships the wrong headline.
  Mitigation: TASK-001 subsets and verifies a separate italic face.

## Acceptance Criteria

- [ ] No page requests `fonts.googleapis.com` or `fonts.gstatic.com`; both
      families load from `public/fonts/` and render with the network blocked.
- [ ] `вгдж икпт цщ ю` renders with Bulgarian letterforms on every page.
- [ ] No occurrence of `Inter`, `#2563eb`, `#1d4ed8`, `#3b82f6` or `#60a5fa`
      remains under `src/` **or** `public/` — including inside
      `public/favicon.svg`.
- [ ] The favicon and the header brand render in the Дворът palette.
- [ ] Every text/background pair in the shipped palette meets WCAG AA
      (4.5:1 body, 3:1 large/UI), verified by computed ratios in TASK-008.
- [ ] `npm run test`, `npm run lint`, `npm run check` and `npm run build` all
      pass. Exactly **one** test assertion may change:
      `SearchExperience.test.tsx:10` asserts the contiguous string
      `Коя е моята градина?`, which cannot survive the H1 being split into
      spans. It is updated to assert the same words semantically (e.g. against
      the text content with tags stripped), never loosened to a substring that
      would pass on a broken headline. Every other assertion — in particular
      `SearchResults.test.tsx:198`'s bare `<h3>` — stays byte-identical.
- [ ] Search, autocomplete (mouse + ArrowUp/ArrowDown/Enter/Escape), filters,
      freshness line, stale banner, district-fallback and missing-district
      notices, all three empty states and sessionStorage persistence behave
      exactly as before, demonstrated at runtime.
- [ ] Home, pravila and 404 are visually consistent at 1440px and 390px.
- [ ] `showNav` is still `false` and the nav markup is unchanged in behaviour.
- [ ] An in-repo `docs/design/` describes Дворът, not the old blue system, and
      contains the approved reference rendering.
- [ ] Italic Cormorant Garamond loads as its own face; `моята` renders as a
      true italic, not a synthesised one.

## Tasks

Task state lives here. Tasks are appended by `scripts/add_task.py` and
`scripts/add_final_task.py`. Update the checkboxes as work progresses.

- [x] TASK-001: Self-host Sofia Sans and Cormorant Garamond, retire Inter
- [ ] TASK-002: Replace the design tokens in BaseLayout with the Дворът system (depends on TASK-001)
- [ ] TASK-009: Add a deterministic API fixture harness for runtime verification (depends on TASK-002)
- [ ] TASK-003: Restyle the site chrome: header, brand, favicon, footer, hidden nav (depends on TASK-002)
- [ ] TASK-004: Restyle the home hero, search field and suggestion panel (depends on TASK-002)
- [ ] TASK-005: Restyle results: filters, group headings, cards and empty states (depends on TASK-004,TASK-009)
- [ ] TASK-006: Restyle the pravila and 404 pages (depends on TASK-002)
- [ ] TASK-007: Create in-repo docs/design describing Дворът (depends on TASK-005,TASK-006)
- [ ] TASK-008: Final Validation
