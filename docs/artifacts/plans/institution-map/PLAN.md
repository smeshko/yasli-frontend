# Plan: Map with pins and link-outs

Status: in-progress
Branch: feature/yas-12-institution-map
Risk: medium
Epic: 01 — Institution detail page with map ([epic](../../epics/01-institution-detail-page.md))
Phase: 1.2 — Map with pins and link-outs
Linear: YAS-12
Created: 2026-09-21

## Goal

A parent who opens an institution's page can see where its buildings are on a
Bulgarian-labelled map, and hand the address to their own phone's map app for
directions — with the four link-outs working even when the map, or JavaScript
itself, does not.

## Scope

- `src/data/institutions-manifest.json` gains `location`
  (`{lat, lon, precision} | null`), and
  `scripts/generate-institutions-manifest.mjs` gains the validation for it.
  `InstitutionListItem` already carries the field, so the generator makes no
  extra request. `ManifestEntry` in `src/lib/institutions/manifest.ts` is
  widened to match.
- `src/lib/domain/mapLinks.ts` — the four link-out URL builders from research
  §5.2 (directions, Google Maps, Apple Maps, OpenStreetMap) plus their
  Bulgarian labels, as pure unit-tested functions.
- `src/pages/institution/[slug].astro` renders the link-outs **in the
  frontmatter, with no hydration**, so they work with JavaScript disabled.
  "Как да стигна" is the primary affordance. A row whose `location` is `null`
  renders no link-out block at all.
- `src/lib/map/style.ts` — `bulgarianLabelStyle(style)`, which rewrites only
  those `text-field` expressions that mention `name:latin` to
  `["coalesce", ["get","name:bg"], ["get","name"]]` and leaves `ref`-based
  shields alone; and `styleUrlForTheme(theme)` returning the
  `positron`/`dark` pair.
- `src/components/InstitutionMap.tsx` — the map itself. `maplibre-gl@^6` is
  added as a dependency and pulled in by a dynamic `import()` behind an
  `IntersectionObserver`, so its weight lands only when the container scrolls
  into view. Main pin in the kind hue, smaller outlined pins for branches that
  have a coordinate, view fitted to all of them, default attribution left on,
  theme followed by observing `data-theme` plus `prefers-color-scheme`,
  `prefers-reduced-motion` honoured.
- `src/components/InstitutionProfile.tsx` mounts the map between the address
  and contacts sections, fed by the manifest `location` threaded down from
  Astro and by `profile.branches` from its own fetch. No coordinate, no WebGL
  or a failed style load means no container — never an error state.
- `docs/ARCHITECTURE.md` and `README.md` record the new manifest field, the
  map island, and that regenerating the manifest now needs a backend carrying
  backend phase 1.2's coordinates.

## Out of Scope

- **Any pin, line or distance for the parent's own address.** Ruled out on
  measured grounds — 0/18 real Varna addresses geocode to house precision and
  the misses land in the wrong municipality (research §5.1). The directions
  link answers the same question by letting the phone do it.
- **District or catchment shading of any kind.** Phase 1.3 was removed from
  the epic on 2026-09-20; street-level catchment geometry was never feasible
  (research §5).
- **Popups, tooltips or any click behaviour on a pin** — see `DECISIONS.md` 4.
  The branch label and address stay in 1.1's text list.
- **A map on the search screen or on result cards.** Epic 02 territory, and
  the whole point of the lazy import is that the map's weight never reaches
  `/`.
- **Rendering the address, contacts or anything else without JavaScript.**
  Only the link-outs move into the static frontmatter; the rest of the page
  stays inside 1.1's island (`DECISIONS.md` 1).
- **Adding the 18 missing infant-group coordinate rows.** That is a backend
  change to `institution_locations.csv`; this plan records the gap
  (`DECISIONS.md` 5).
- **Self-hosting tiles, glyphs or sprites.** OpenFreeMap needs no key and no
  registration; a CDN mirror would be a new operational surface for nothing.
- **Hand-written API types.** `Location` is already in the committed
  `types.ts`; nothing here regenerates it.

## Research Summary

See [RESEARCH.md](./RESEARCH.md). The findings that shaped this plan:

1. **The coordinate is already typed and already on the list endpoint.**
   `Location` is committed in `types.ts` and hangs off `InstitutionDetail`,
   `InstitutionListItem` and `Branch`, so the manifest can carry it for the
   cost of one extra field — no second request, no type regeneration.
2. **The deployed backend does not serve it yet.** Production's
   `/api/institutions` returns 95 rows with no `location` key, and
   `by-source` still 404s: backend 1.2/1.3 are on the backend's `staging`,
   and Railway deploys `main`. TASK-001 regenerates against a locally seeded
   backend, as 1.1's real-data check did.
3. **Every institution building is pinned at building precision** — 77/77
   mains in `institution_locations.csv`, plus 16 of 17 branch rows. ДГ№13
   „Мир“ has its main row and all four branches, so the epic's 5-pin
   criterion is reachable from real data.
4. **18 of the 95 manifest rows can never have a coordinate** — infant-group
   kindergartens listed a second time under `nursery/<kindergarten id>`, whose
   building is keyed only under `kindergarten/<id>`. Nothing links to those
   URLs. They stay mapless; see `DECISIONS.md` 5.
5. **`liberty` has no dark counterpart, and `positron`/`dark` do.** Measured
   layer counts 111 vs 55/47; all styles share glyphs, sprite and sources on
   `tiles.openfreemap.org`. The muted pair also sits far better inside the
   cream-and-ink design system.
6. **Not every `text-field` is a name.** Alongside the `name:latin` +
   `name:nonlatin` concat the epic warns about, `highway_name_motorway` uses
   `["to-string", ["get","ref"]]`. Patching every `text-field` would blank the
   motorway shields, so the rewrite is conditional on the expression
   mentioning `name:latin`.
7. **`name:bg` is present in every label layer of the tiles** — confirmed from
   the planet TileJSON's `vector_layers` — so the coalesce resolves rather
   than silently falling through to `name`.
8. **Attribution ships with the TileJSON**, so MapLibre's default
   `AttributionControl` satisfies the criterion as long as it is not disabled.
9. **`ThemeToggle.astro` emits no event.** It writes
   `document.documentElement.dataset.theme` and treats "system" as the absence
   of a stored value, so the map must observe the attribute and
   `prefers-color-scheme`, not wait for a signal.
10. **Tests are SSR-markup tests** in a node environment — no DOM, no canvas,
    no WebGL, and effects never run. Everything testable must live in pure
    functions; the component test can only assert the rendered container or
    its absence. The rest is runtime evidence in TASK-007.
11. **Astro already emits one chunk per island**, so a dynamic import lands in
    its own chunk, reachable from `InstitutionProfile.*.js` and from nothing
    the search screen loads. Baseline sizes are recorded for the delta.
12. **The fixtures already serve `location`** on profiles and branches (1.1
    added it so the payload matched the schema field for field), including a
    null-location institution and branches with and without coordinates. No
    fixture work is needed.

## Decisions

The five choices where real alternatives were weighed are in
[DECISIONS.md](./DECISIONS.md): where the no-JS path stops; where the map
component lives; which OpenFreeMap styles; how much the pins do; and what the
18 unpinnable nursery rows get. The rest:

- **The map sits between the address and the contacts.** The address names the
  place, the map shows it, then the page moves on to how to reach the people.
  Putting it above the address would open the page on a rectangle that is
  still loading.
- **The link-outs render once, statically, and never inside the island.** One
  copy on the page, and it is the copy that survives with JS off.
- **The main pin's coordinate comes from the manifest, not the fetched
  profile.** They are the same value from the same table, and using the
  manifest makes the pin and the link-outs agree by construction rather than
  by coincidence.
- **The map appears only once the profile has loaded.** It could be drawn
  earlier from the manifest alone, but a container that appears, draws one
  pin, then re-fits when branches arrive is two layout shifts for no
  information — and the address and link-outs above it already answer "where
  is this" during that window.
- **No coordinate, no WebGL, no style: no container.** All three are designed
  absences, not errors. Nothing on the page says the map failed, because a
  parent who cannot see a map is not helped by being told so — the address and
  the link-outs are still there.
- **`maplibre-gl` is an npm dependency, not a CDN script.** Consistent with
  every other dependency here, it keeps the build hermetic, and it leaves
  `tiles.openfreemap.org` as the single third-party origin the page touches.
- **Pins are DOM markers styled with the existing tokens**, not sprite images
  or a GeoJSON symbol layer. They inherit the kind hue from the page's
  `data-kind`, so the map matches its page in both themes without a second
  palette.
- **The view fits all pins with padding**, rather than centring on the main
  one at a fixed zoom. A single pin gets a fixed zoom, because fitting one
  point has no meaning.
- **Bulgarian copy only**, as everywhere else on the site, and every link-out
  carries `target="_blank" rel="noreferrer"` and the `↗` marker that 1.1
  established for outbound links.
- **`precision` is carried through the manifest but not rendered.** Every
  shipped row is `building`; storing the field keeps the manifest honest if an
  `approximate` row ever appears, and gives a later phase something to gate on
  without regenerating.
- **No fixture-server changes.** Its profiles already cover the full-pin,
  partial-pin and no-coordinate cases.

## Risks

- **The manifest can only be regenerated against a non-production backend.**
  Production has no `location` on `/api/institutions`, so a bare
  `npm run institutions:manifest` against the documented production URL would
  strip the field from all 95 rows. Mitigation: the generator treats a payload
  where *no* row has a `location` as an error and exits non-zero rather than
  writing; TASK-001 regenerates against a locally seeded backend and records
  the source URL and the pinned-row count in the commit message; the README
  gains the same warning it already carries about the fixture server's port.
- **Committing coordinates the deployed API does not serve** means the static
  link-outs work in production while the island below still renders 1.1's
  not-found state until backend `main` catches up. Mitigation: this is 1.1's
  existing, documented condition, not a new one; the link-outs degrade to
  "present and correct", which is strictly better than absent.
- **A style-schema change at OpenFreeMap** could break the `text-field` patch
  silently, leaving Latin labels. Mitigation: the patch is a pure function
  over a style object, unit-tested against every expression shape measured
  today, and it counts what it rewrote; TASK-005 logs nothing in production
  but TASK-007 confirms Cyrillic labels visually at Varna zoom levels.
- **MapLibre throws where WebGL is unavailable** (older devices, hardened
  browsers, some headless contexts). Mitigation: the dynamic import and the
  constructor are both wrapped; any failure unmounts the container and leaves
  the page exactly as the no-coordinate case.
- **~200 KB gzipped of new JavaScript.** Mitigation: it is reachable only from
  the detail route's chunk and is requested only when the container intersects
  the viewport; TASK-007 records the measured per-chunk delta for `/` and for
  the detail route against the baseline in RESEARCH.md fact 13.
- **The map canvas is focusable and could become a keyboard trap.**
  Mitigation: no focusable children (pins are `aria-hidden` and
  non-interactive), the region is labelled and skippable, and TASK-007 walks
  the whole page by keyboard in both themes.
- **Theme following is observation, not a contract.** `ThemeToggle` emits no
  event, so a `MutationObserver` on `data-theme` plus a `prefers-color-scheme`
  listener is the only mechanism; if `ThemeToggle` ever changes how it stores
  the choice, the map silently stops following. Mitigation: the map reads the
  theme through one small exported helper with a comment naming
  `ThemeToggle.astro`, so there is a single place to keep in step — the same
  treatment `storedSearch.ts` gives the `sessionStorage` key.
- **A style swap discards sources and markers.** Setting a new style resets
  the map's state, so the pins and the label patch have to be reapplied on
  every theme change. Mitigation: both are driven from one function that runs
  on load and on every style change, and TASK-007 toggles the theme with the
  map on screen and checks the pins survive.
- **Tests cannot touch the map.** No DOM, no canvas, no WebGL in the node test
  environment, so behaviour coverage is unit tests over pure helpers plus
  runtime evidence. Mitigation: the plan states this openly, keeps the
  component a thin shell over tested functions, and treats TASK-007's
  screenshots and network capture as the real gate.

## Acceptance Criteria

- [ ] `src/data/institutions-manifest.json` carries `location` for all 77
      pinnable rows and `null` for the 18 infant-group rows; the generator
      exits non-zero against a backend that serves no coordinates, and is
      idempotent (a second run produces no diff).
- [ ] With JavaScript disabled, `/institution/kindergarten-46/` shows all four
      link-outs and each one opens the right place; the map and the address
      are absent. (The epic's wording is narrowed here — see `DECISIONS.md` 1.)
- [ ] The map renders ДГ№13 „Мир“ at building precision with **5 pins** (main
      + 4 branches) against a backend carrying backend phase 1.2's
      coordinates; an institution with no branches shows 1.
- [ ] Base-map labels are Bulgarian at Varna zoom levels, and motorway shields
      still show their `ref` number rather than going blank.
- [ ] `/institution/nursery-47/` — an infant-group row with no coordinate —
      renders the page with no map container, no link-out block and no error;
      the same is true for the fixture's `kindergarten-34`.
- [ ] Tile, glyph and sprite requests go only to `tiles.openfreemap.org`, with
      no API key and no other third-party host.
- [ ] Attribution is visible on the map; the map region is labelled, reachable
      and skippable by keyboard, contains no focusable children, and traps
      nothing.
- [ ] Both themes render legibly: `positron` under light, `dark` under dark;
      toggling the theme with the map on screen re-applies the Bulgarian
      labels and keeps every pin.
- [ ] `prefers-reduced-motion: reduce` suppresses the map's animated camera
      movement.
- [ ] The MapLibre chunk is absent from the search screen's payload, and is
      requested on the detail route only once the map scrolls into view; the
      measured per-chunk delta for `/` is zero.
- [ ] `npm run build` still succeeds with no backend running and emits one
      page per manifest row.
- [ ] `npm run lint`, `npm run check` and `npm run test` pass.
- [ ] The page is legible at 390px and 1440px in both themes for one
      kindergarten with branch pins, one single-pin institution and one with
      no coordinate.

## Tasks

Task state lives here. Tasks are appended by `scripts/add_task.py` and
`scripts/add_final_task.py`. Update the checkboxes as work progresses.

- [x] TASK-001: Carry the institution coordinate in the manifest
- [x] TASK-002: Add the map link-out URL builders
- [x] TASK-003: Render the link-outs statically on the detail page (depends on TASK-001,TASK-002)
- [x] TASK-004: Add the map style helpers: Bulgarian labels and the theme pair
- [x] TASK-005: Build the lazily loaded InstitutionMap island (depends on TASK-004)
- [x] TASK-006: Mount the map on the profile and document the route (depends on TASK-001,TASK-005)
- [ ] TASK-007: Final Validation
