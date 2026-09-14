# Epic 01 — Institution detail page with map

Status: planned
Created: 2026-08-17
Depends on: backend epic 01 (all phases)
Project: none
Linear: none
Milestone: none

## Overview

Give every institution a shareable page that answers PRD job #2 — "tell me more
about this kindergarten" — without sending the parent to the source portal's
one-PDF-per-institution experience. The page shows identity, physical address,
contacts, the full catchment as text, the branch buildings, and a map pin with a
hand-off to the parent's own map app for directions. This restores the route that
s12 deliberately deleted, so the decision to re-widen the app shell beyond `/`
is explicit and owned here.

The route is prerendered from a committed manifest rather than from the live API,
because CI has no backend access — `npm run api:types` is skipped there for that
exact reason, and the manifest follows the same committed-generated-artifact
pattern.

## Architecture references

- [INSTITUTION_DETAIL_MAP_RESEARCH.md](../../../../openspec/docs/INSTITUTION_DETAIL_MAP_RESEARCH.md) — the detail-page content inventory (§2), map provider comparison and the `name:bg` label trap (§6), link-out URLs (§5.2), the district-polygon coverage gaps (§4.2), and what is deliberately ruled out (§5.1)
- [PRD.md](../../../../openspec/docs/PRD.md) — FR-8, FR-11, FR-12, FR-15, FR-17 and §7.3 (institution profile screen)
- [PRESCHOOL_COVERAGE_RESEARCH.md](../../../../openspec/docs/PRESCHOOL_COVERAGE_RESEARCH.md) — §5 has the empty-catchment copy to reuse verbatim on preschool pages
- [NURSERY_RESEARCH.md](../../../../openspec/docs/NURSERY_RESEARCH.md) — §3 explains why nursery pages must show a district, not a catchment
- [DESIGN-SYSTEM.md](../../design/DESIGN-SYSTEM.md) — tokens, type scale and the light/dark contract the map has to live inside
- [accessibility-audit.md](../../../../docs/design/accessibility-audit.md) — the WCAG 2.2 baseline; the map must not reintroduce a focus or live-region defect
- [s12 freeze change](../../../../openspec/changes/archive/2026-05-12-s12-freeze-remove-institution-pages/proposal.md) — what was removed and why, i.e. what this epic reverses

## Dependencies

- **[backend epic 01](../../../../backend/docs/artifacts/epics/01-institution-data-foundation.md)** — every phase here reads fields it adds. 1.1 needs the `by-source` route and the contacts (backend 1.3); 1.2 needs the coordinates (backend 1.2); 1.3 needs `district_code` (backend 1.3).
- **[scraper epic 01](../../../../scraper/docs/artifacts/epics/01-contact-metadata.md)** — contacts are only non-null once the scraper emits them.

## Out of scope

- The browse-all directory and the nav item — [Epic 02](./02-institution-directory-and-availability.md), phase 2.1.
- Free places — backend epic 02 and Epic 02, phase 2.2.
- Any pin or distance line for the parent's **own** address. Ruled out on measured grounds (research §5.1): 0/18 real Varna addresses geocode to house precision, and the misses land in the wrong municipality. The directions link covers the same job by letting the phone do it.
- District shading on kindergarten pages. Their `district_code` is derived by catchment-majority and is not their catchment; showing it would teach parents something false.
- Street-level catchment geometry (research §5).

## Phase 1.1 — Detail route and page content

**Plan**: _not yet created_

**Linear**: none

**Goal**: Every institution has a prerendered, shareable detail page showing its identity, contacts, catchment and branches, without a backend at build time.

### What to build

- A `scripts/generate-institutions-manifest.mjs` + `npm run institutions:manifest` pair modelled on `scripts/generate-api-types.mjs`: hits a live backend, writes a committed JSON manifest of `(kind, external_id, name)`, and is **not** run in CI.
- `src/pages/institution/[slug].astro` with `getStaticPaths` reading that manifest. Slug is `<kind>-<external_id>` (e.g. `kindergarten-46`); the page hydrates from `GET /api/institutions/by-source/{kind}/{external_id}`.
- Page sections: header (name, kind badge, ДГ/ДЯ number parsed from the name — **not** `DZ_NUMBER`, which tracks the internal id), physical address, contacts (phone as `tel:`, e-mail as `mailto:`, director, website for schools), the catchment grouped by street with natural number ordering, the branch list as text, `last_seen_at` freshness plus the >14-day stale banner, and the outbound source link marked external.
- Per-kind empty states: nurseries explain district routing instead of showing an empty catchment; preschools reuse the copy from `PRESCHOOL_COVERAGE_RESEARCH.md` §5.
- "Serves your address" context when the parent arrives from a result — carry the matched address and `match_basis` (`address` vs `district`) across the navigation, reusing the existing sessionStorage restore mechanism in `SearchExperience.tsx`.
- Re-add the "Детайли" link on result cards in `SearchResults.tsx` alongside the existing "Източник" link.
- Loading, not-found and API-error states, matching how the search screen already handles them.

### Acceptance criteria

- [ ] `npm run build` succeeds with **no backend running** and emits one page per institution in the manifest
- [ ] A direct visit to `/institution/kindergarten-46/` renders ДГ№13 "Мир" with its address, contacts, catchment and its 4 branch addresses as text
- [ ] A nursery page shows the district it serves and no empty catchment list; a preschool page with no published catchment shows the §5 copy, not a generic "no results"
- [ ] Arriving from a search result shows which address the parent searched and whether the match was address- or district-based; arriving directly shows neither and nothing looks broken
- [ ] An unknown slug renders the 404 page rather than an error state
- [ ] Keyboard-only navigation reaches every link with a visible focus indicator; the page passes `npm run lint`, `npm run check` and `npm run test`

### Validation

Screenshot the page for one kindergarten with branches, one nursery and one preschool with no catchment, at mobile width, in both themes. Show `npm run build` completing with the backend stopped.

---

## Phase 1.2 — Map with pins and link-outs

**Plan**: _not yet created_

**Linear**: none

**Goal**: The detail page shows the institution on a map with its branch buildings, and hands off to the parent's own map app for directions.

### What to build

- MapLibre GL JS pointed at OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`) — no API key, no quota, no registration.
- Patch the style's `text-field` to `["coalesce", ["get","name:bg"], ["get","name"]]`. The stock style renders `name:latin` + `name:nonlatin`, which shows Latin transliteration in a Bulgarian-only UI.
- Main pin from `location`; secondary pins for branches that have a coordinate. Branches without one stay text-only in 1.1's list.
- Link-outs built from the coordinate: directions (`google.com/maps/dir/?api=1&destination=`), Google Maps, Apple Maps, OpenStreetMap. Directions is the primary affordance — it answers "how do I get there from where I am" without us ever handling the parent's location.
- Light/dark handling consistent with `ThemeToggle`, lazy hydration (`client:visible`) so the map's weight never lands on the search screen, and a graceful no-JS/failed-tile path: the textual address and the link-outs must work with the map absent.
- Attribution as required by OpenStreetMap/OpenFreeMap.

### Acceptance criteria

- [ ] The map renders the institution at building precision, with Bulgarian labels
- [ ] ДГ№13 "Мир" shows 5 pins (main + 4 branches); an institution with no branches shows 1
- [ ] An institution whose coordinate is missing renders the page without a map container and without an error
- [ ] With JavaScript disabled the address and all four link-outs still work
- [ ] The map does not appear in the search screen's JS payload
- [ ] Attribution is present; the map region is keyboard-skippable and does not trap focus
- [ ] Both themes render legibly; `npm run lint`, `npm run check`, `npm run test` pass

### Validation

Screenshots in both themes at mobile and desktop width, plus a screenshot with JS disabled. Show the tile requests going only to `tiles.openfreemap.org` (no key, no other host), and the built page-weight delta for `/` versus the detail route.

---

## Phase 1.3 — District overlay where the district is the routing basis

**Plan**: _not yet created_

**Linear**: none

**Goal**: Nursery pages and district-routed preschool pages shade the район they actually serve, and say nothing when the polygon does not cover the address.

### What to build

- A committed static GeoJSON asset with the 5 Varna district polygons (OSM relations `R16951188` Одесос, `R16951189` Приморски, `R16951190` Младост, `R16951200` Владислав Варненчик, `R16951215` Аспарухово), simplified and coordinate-rounded — ~25 KB for all five, no runtime geometry API.
- Render the polygon for the institution's `district_code` on **nursery** pages and on **preschool** pages, with copy that names it as the район it serves. Kindergarten pages get no shading (see Out of scope).
- Handle the measured coverage gaps: Виница, Тополи, Константиново and Казашко fall outside all five polygons. Where the institution's own point falls outside its district polygon, do not shade — show the district as text only. Never draw a shape that contradicts the pin.
- A one-off validation script comparing each district polygon against the institutions the API assigns to that district, so the gap set is known rather than discovered by a user.

### Acceptance criteria

- [ ] A nursery page shades exactly the район its `district_code` names, and labels it as район (not райониране)
- [ ] Kindergarten pages show no polygon
- [ ] For an institution outside all five polygons, the page states the district in text and draws no shape
- [ ] The GeoJSON asset is under ~30 KB and is served from our own origin
- [ ] The validation script's output is recorded in the plan's evidence, listing every institution whose point falls outside its assigned district
- [ ] Both themes keep the polygon fill distinguishable from the base map at WCAG-adequate contrast; lint/check/test pass

### Validation

Screenshots of one nursery per district, plus the Виница/Тополи no-shading case. Include the validation script's output as the evidence artifact.

---

<!-- PHASES -->

## Epic-level acceptance criteria

- [ ] Every phase merged and its acceptance criteria met
- [ ] A parent can go from a search result to a detail page, see where the institution is, and get directions on their phone
- [ ] Nothing on the page implies we know something we don't: no catchment polygons, no shading on kindergarten pages, no pin for the parent's own address
- [ ] Status row in [EPICS.md](./EPICS.md) updated to `Done`
