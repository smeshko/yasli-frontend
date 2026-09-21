# TASK-007: Final Validation

Depends on: all prior tasks
Suggested commit: `chore: final validation for institution-map`

## Goal

Confirm the plan is fully implemented and production-ready, with every
acceptance criterion backed by produced evidence rather than by a reading of
the diff.

## Steps

- [ ] All task checkboxes in `PLAN.md` are ticked
- [ ] `npm run lint` and `npm run check` pass with no issues
- [ ] `npm run test` passes in full
- [ ] `npm run build` succeeds with **no backend running** and still emits one
      page per manifest row
- [ ] Module boundaries respected: `src/lib/map/*` imports nothing from
      `maplibre-gl` at module scope, and no route other than
      `/institution/[slug]` can reach the map chunk
- [ ] `PLAN.md` acceptance criteria all met, each with its evidence produced —
      no criterion ticked on "the code looks right"

### Evidence to produce

- [ ] **Five pins, real data.** Against the locally seeded backend (backend
      `staging` + its production-like seed), screenshot
      `/institution/kindergarten-46/` showing ДГ№13 „Мир“ with its main pin
      and four branch pins. Screenshot a single-pin institution beside it.
- [ ] **Bulgarian labels.** A zoomed screenshot at Varna street level showing
      Cyrillic street and place names, plus one showing a motorway shield
      still carrying its `ref` number.
- [ ] **No coordinate, no map.** `/institution/nursery-47/` with no map
      container, no link-out block and no error; the fixture's
      `/institution/kindergarten-34/` likewise.
- [ ] **No JavaScript.** `/institution/kindergarten-46/` loaded with scripting
      disabled, showing the four link-outs present and working; state plainly
      in the evidence that the address and map are absent, since that narrows
      the epic's original wording (`DECISIONS.md` 1).
- [ ] **Tile origins.** A network capture filtered to the detail page showing
      every tile, glyph and sprite request going to `tiles.openfreemap.org`,
      no API key in any URL, and no other third-party host.
- [ ] **Lazy load.** The same capture showing the MapLibre chunk requested
      only after the container scrolls into view, and absent entirely from a
      load of `/`.
- [ ] **Page-weight delta.** `ls -la dist/_astro/*.js` against the baseline in
      RESEARCH.md fact 13, reporting the delta for `/` (expected: zero) and
      for the detail route.
- [ ] **Both themes, both widths.** Six screenshots: a kindergarten with
      branch pins, a single-pin institution, and one with no coordinate, at
      390px and 1440px, in light and dark.
- [ ] **Theme swap with the map on screen.** Toggle light → dark → light and
      confirm the pins survive and the labels stay Cyrillic after each style
      change.
- [ ] **Keyboard walk.** Tab through the whole page in both themes: every
      link-out reachable with a visible focus indicator, the map region
      skippable, no focus trapped inside the container.
- [ ] **Reduced motion.** With `prefers-reduced-motion: reduce`, confirm the
      camera does not animate.
- [ ] **Manifest integrity.** The generator's summary line for two
      consecutive runs with an empty diff between them, and the counts: 95
      rows, 77 located, 18 null.
- [ ] **The 18 unpinnable rows, by name.** List every `nursery/<id>` row with
      `location: null` in the evidence, so the backend follow-up
      (`DECISIONS.md` 5) is specified rather than remembered. Raise it as a
      backend issue against `institution_locations`.

### Epic update

- [ ] Tick phase 1.2's `### Acceptance criteria` in
      `docs/artifacts/epics/01-institution-detail-page.md`, rewriting the
      JavaScript-disabled criterion to the narrowed wording this plan adopted
      and noting why inline
- [ ] Tick the epic-level criteria this phase satisfies — 1.1 and 1.2 merged;
      a parent can go from a result to a page, see where the institution is
      and get directions; nothing on the page implies knowledge we lack
- [ ] Mark the phase done:
      `python3 ~/.claude/skills/create-epic/scripts/link_plan.py 01 --phase 1.2 --plan institution-map --status done`
- [ ] Update epic 01's row in `docs/artifacts/epics/EPICS.md` to `Done` (1.2
      is the last phase in scope — 1.3 was removed, not deferred), and note
      that Epic 02 is thereby unblocked

## Notes

The 5-pin criterion cannot be shown against production: it still serves the
pre-backend-1.3 contract and answers `by-source` with a 404 (measured
2026-09-21). The locally seeded backend is the evidence source, exactly as it
was for phase 1.1's real-data criterion. Say so in the evidence rather than
implying production was checked.
