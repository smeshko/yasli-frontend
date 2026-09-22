# Decisions — Map with pins and link-outs

Five choices where more than one option was genuinely viable. Everything else
is in `PLAN.md`'s `## Decisions` list.

---

# 1. Where the no-JS path stops

Date: 2026-09-21

## Options Considered

1. **Link-outs static, address stays fetched** — add `location` to the
   committed manifest and render the four link-outs from `[slug].astro`
   frontmatter as plain HTML.
2. **Bake the address in too** — have the generator call `by-source` once per
   manifest row so the manifest carries `address` as well, and render both
   statically.
3. **Everything stays in the island** — no manifest change; reinterpret the
   criterion as graceful degradation when WebGL or the tiles fail.

## Dependencies

- The epic's criterion reads "With JavaScript disabled the address and all
  four link-outs still work."
- Phase 1.1 put the address inside `InstitutionProfile`, a `client:load`
  island. With JS off the page today renders only its header. The criterion
  was written before that page existed.
- `InstitutionListItem` already carries `location`, so option 1 costs the
  generator no extra request. `address` is not on that endpoint, so option 2
  costs ~95 requests per regeneration.
- Coordinates are reference data curated by hand in
  `backend/data/institution_locations.csv` and change essentially never.
  `address`, `phone` and the rest are scraped weekly.

## Selected Option

Option 1, with the epic criterion rewritten to name the link-outs only.

## Rationale

It is the only option that buys the no-JS guarantee without duplicating a
volatile field. The line it draws is principled rather than convenient: the
manifest carries build-stable identity and geometry, the API carries
everything that changes. The four link-outs are also the part of the criterion
that matters most — "Как да стигна" is the page's single most useful
affordance (research §5.2), and it is exactly the thing that should not need a
successful API round-trip to exist.

Narrowing a criterion is a real cost, so the plan states the new wording and
TASK-007 records what a JS-disabled visit actually shows.

## Rejected Options

- **Option 2** — puts a weekly-changing field behind a manually refreshed
  artifact. The page would then render the address twice from two sources, and
  a stale manifest would show an address that disagrees with the one the
  island fetched a moment later. Buying one criterion with a permanent
  correctness hazard is a bad trade.
- **Option 3** — cheapest, and it is what the site does today, but it answers
  the criterion by deleting it. The link-outs genuinely can work without JS,
  so refusing to make them work is a choice not to, not an inability.

---

# 2. Where the map component lives

Date: 2026-09-21

## Options Considered

1. **Inside `InstitutionProfile`** — a React child of the existing
   `client:load` island, with `maplibre-gl` pulled in by a dynamic `import()`
   behind an `IntersectionObserver`.
2. **A separate `client:visible` island that fetches for itself** — exactly
   the epic's wording; renders the main pin from the manifest, then issues its
   own `by-source` request for branch coordinates.
3. **A separate `client:visible` island over a shared cache** — a memoized
   profile module both islands read, modelled on `referenceData.ts`.

## Dependencies

- The epic says "lazy hydration (`client:visible`) so the map's weight never
  lands on the search screen".
- Branch pins need `branches[].location`, which is on `InstitutionDetail` and
  **not** on `InstitutionListItem`. A manifest-fed island cannot see it.
- The 5-pin ДГ№13 criterion makes branch pins non-optional.
- Astro emits one chunk per island; a dynamic import becomes its own chunk
  either way, so the search screen is unaffected by all three.

## Selected Option

Option 1.

## Rationale

The epic's stated mechanism and the epic's stated outcome pull apart once
branch coordinates enter the picture, and the outcome is what matters: the
map's weight must not reach the search screen, and it should not reach the
detail page's initial payload either. A dynamic import gated on an
`IntersectionObserver` delivers both — arguably more strictly than
`client:visible`, since the MapLibre chunk is requested only when the
container scrolls into view rather than when the island hydrates.

It also keeps the page at one `by-source` request and one source of truth for
branches, with no new module and no cross-island plumbing.

## Rejected Options

- **Option 2** — doubles the request count on every detail-page view to buy a
  directive keyword. It also splits the failure modes: the map and the profile
  could disagree about whether the institution exists.
- **Option 3** — faithful to the epic and single-fetch, but the retry button
  in the island's error state must invalidate the cache, and the map must
  subscribe to learn when data lands. That is two more moving parts that have
  to stay in step with each other, for a benefit option 1 already provides.

---

# 3. Which OpenFreeMap styles

Date: 2026-09-21

## Options Considered

1. **`positron` (light) + `dark`** — the muted pair.
2. **`liberty` (light) + `dark`** — the epic's named light style, with the
   only dark style available.
3. **`liberty` in both themes** — the epic's letter, no swap.

## Dependencies

- The epic names `https://tiles.openfreemap.org/styles/liberty`.
- Measured 2026-09-21: `liberty` is 111 layers of full-colour cartography and
  has no dark counterpart; `positron` (55 layers) and `dark` (47) are designed
  as a pair. All share glyphs, sprite and sources.
- The design system is a cream-and-ink riso palette whose only saturated
  colours are the three kind hues.
- The epic also requires "Both themes render legibly".

## Selected Option

Option 1 — `positron` light, `dark` dark.

## Rationale

The map has to live inside an existing visual system, not next to one. A
full-colour base map would be the loudest thing on a page built from cream,
ink and one hue, and it would compete with the pins — which are the only thing
on the map the parent needs to find. A muted base leaves the kind hue as the
only saturated mark.

The pair is also symmetric: the same cartographer's layer set in two
palettes, so the theme swap reads as one map changing stock rather than two
different maps. And at 55/47 layers instead of 111 there is materially less to
patch and less to fight.

This departs from the epic's letter, which the plan states plainly; the epic's
reason for naming `liberty` was "no API key, no quota, no registration", and
all three OpenFreeMap styles satisfy that equally.

## Rejected Options

- **Option 2** — asymmetric. The two styles have different layer sets and
  unrelated palettes, so toggling the theme changes more than the stock.
- **Option 3** — a bright map on dark stock fails the epic's own legibility
  criterion. Simplicity is not worth failing the thing it was meant to serve.

---

# 4. How much the pins do

Date: 2026-09-21

## Options Considered

1. **Static pins** — main pin in the kind hue, branch pins smaller and
   outlined; no popups, no click handlers; markers `aria-hidden`, with 1.1's
   existing "Филиали" text list as the accessible equivalent.
2. **Pins with click popups** — each pin opens a MapLibre popup carrying the
   branch label and address.

## Dependencies

- The epic requires the map region to be keyboard-skippable and to not trap
  focus.
- The accessibility audit treats focus and live-region defects as blocking.
- Phase 1.1 already renders every branch's label and address as text directly
  below where the map will sit.
- Tests run in a node environment with no DOM, so popup behaviour could only
  ever be verified by hand.

## Selected Option

Option 1.

## Rationale

The popup's entire payload is already on the page, in a form that works for
screen readers, keyboards and JS-disabled visitors alike. Adding a second,
worse copy of it inside a canvas container means owning focus order, Escape
dismissal and an announcement strategy for every pin — permanently, and
without automated coverage — to show the reader something they can already
read.

What the map uniquely adds is spatial: *where* these buildings are relative to
each other and to the streets. Static pins deliver that in full.

## Rejected Options

- **Option 2** — more discoverable on desktop, and a real cost in
  accessibility surface on a project that has already paid down one audit.
  Revisit only if the branch list is ever removed from the page.

---

# 5. What the 18 unpinnable nursery rows get

Date: 2026-09-21

## Options Considered

1. **Leave them mapless, file a backend follow-up.**
2. **Fall back to the kindergarten's pin** — a `nursery` row with no location
   borrows `kindergarten/<same external_id>`'s.
3. **Block on a backend fix** — add the 18 missing `main` rows to
   `institution_locations.csv` before this phase ships.

## Dependencies

- 18 of 95 manifest rows are infant-group kindergartens listed a second time
  under `nursery/<kindergarten external_id>`; `institution_locations` keys
  that building only under `kindergarten/<id>` (research fact 5).
- Those rows are the same physical building as their kindergarten twin, so
  option 2 would not be factually wrong.
- Nothing links to those URLs: `SearchResults.tsx` builds hrefs from
  `institution_kind`, so an infant-group card points at the kindergarten's
  page. They are reachable only by typing the URL.
- The project's standing rule, stated three times in this epic, is that the
  page never implies we know something we don't.
- Epic 01's dependency list does not include a further backend change.

## Selected Option

Option 1.

## Rationale

The "no coordinate → no map container, no error" path already covers these
pages exactly, so they cost nothing to leave alone, and no user journey
reaches them. Against that, option 2 would have the frontend draw a pin on a
page whose API payload says `location: null` — inferring a fact from a
join-key coincidence and rendering it as if the backend had asserted it.

The fix belongs in `institution_locations`, where the join key is decided.
TASK-007 lists all 18 rows by name as evidence so the follow-up is specified
rather than remembered.

## Rejected Options

- **Option 2** — five testable lines, and it puts the frontend in the business
  of deciding which buildings are the same building. That inference is the
  backend's to make or not make.
- **Option 3** — the correct end state, but it introduces a cross-repo
  dependency mid-epic for 18 pages nothing links to. Worth doing; not worth
  blocking on.
