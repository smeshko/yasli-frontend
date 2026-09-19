# Plan: Institution detail route and page content

Status: in-progress
Branch: feature/yas-11-institution-detail-route
Risk: medium
Epic: 01 — Institution detail page with map ([epic](../../epics/01-institution-detail-page.md))
Phase: 1.1 — Detail route and page content
Linear: YAS-11
Created: 2026-09-15

## Goal

Every institution has a prerendered, shareable page at
`/institution/<kind>-<external_id>/` that shows its identity, address,
contacts, catchment and branches, built with no backend running and hydrated
in the browser from the `by-source` route that backend phase 1.3 adds.

## Scope

- `scripts/generate-institutions-manifest.mjs` + `npm run institutions:manifest`,
  modelled on `scripts/generate-api-types.mjs`: reads the live
  `GET /api/institutions`, writes the committed `src/data/institutions-manifest.json`
  (`kind`, `external_id`, `name` per row, sorted by kind order then numeric
  `external_id`). Never run in CI — the committed file is the build input.
- `src/lib/institutions/manifest.ts` — slug (`<kind>-<external_id>`), page path
  and `getStaticPaths` helpers, unit-tested.
- `src/pages/institution/[slug].astro` — static header (kind label, ДГ/ДЯ
  number parsed from the name, the name as `<h1>`) from the manifest, page
  styles, and the `InstitutionProfile` island below it.
- `src/components/InstitutionProfile.tsx` — a React island that fetches
  `GET /api/institutions/by-source/{kind}/{external_id}` and renders: the
  "serves your address" context, the >14-day stale banner, physical address,
  contacts (`tel:`, `mailto:`, director, website), the catchment grouped by
  street, the branch list as text, the freshness line and the outbound source
  link — plus loading, error-with-retry and not-found states.
- Per-kind empty states: nurseries show the район they serve and never a
  catchment list; preschools with no published catchment show the copy from
  `PRESCHOOL_COVERAGE_RESEARCH.md` §5 verbatim; kindergartens with no
  catchment get their own one-line explanation.
- Search-result context: the page reads the search state the home page already
  persists in `sessionStorage` and, when this institution is in those results,
  shows the searched address and whether the match was by address or by
  district. The load/save helpers move out of `SearchExperience.tsx` into
  `src/lib/search/storedSearch.ts` so both islands share one definition.
- New domain helpers: `parseInstitutionNumber` (number parsed out of the
  name, never `DZ_NUMBER`), district code → name map, a shared stale-banner
  string and date formatter in `freshness.ts`, and `normalizeWebsiteUrl`
  (`http`/`https` only; any other scheme or unparsable value is treated as
  absent, so a scraped `website` never reaches an `href` unchecked).
- `src/lib/api/client.ts`: `getInstitutionBySource` and an
  `institution_not_found` error code.
- `SearchResults.tsx`: the "Детайли" link on every result card whose
  `(institution_kind, external_id)` is in the committed manifest, before the
  existing "Източник" link; `SearchExperience.tsx` passes the manifest slug
  set in as a prop. A result the manifest does not know gets no link rather
  than a link to a static 404.
- `scripts/fixture-server.mjs`: the `by-source` route with deterministic
  profiles keyed to real manifest slugs, so every page state can be
  screenshotted with no backend; documented in `SCENARIOS.md` in this dir.
- `src/lib/api/types.ts` regenerated from a backend that has phase 1.3 merged.

## Out of Scope

- The map, pins and link-outs — phase 1.2. The district polygon overlay —
  phase 1.3. The browse-all directory and the nav item — epic 02.
- Free places, capacity, groups, fees, hours, photos — not available from any
  source (research §2).
- Any pin, distance or line for the parent's own address (research §5.1).
- District shading or a district line on kindergarten pages. Their
  `district_code` is derived by catchment majority and is not an official
  fact; the page never prints it for kindergartens.
- Fixing the English `Last updated:` footer line on `/` (a known copy defect,
  `content-copy-audit.md`). The detail page uses Bulgarian for its own
  freshness line and does not touch the footer slot.
- Enlarging the result-card link tap targets (accessibility audit M5). The
  new link inherits the existing `.card-actions a` sizing.
- Unhiding the site nav (`showNav` stays `false`). The page gets a plain
  "back to search" link instead.
- Renaming or restructuring institution names from API data. The name is
  shown as delivered; the number is an additive badge.
- Hand-written API types. Types come only from `npm run api:types`.

## Research Summary

See [RESEARCH.md](./RESEARCH.md). The findings that shaped this plan:

1. **The route this page reads does not exist yet.** Backend phase 1.3
   (`by-source` route; `address`, `phone`, `email`, `director`, `website`,
   `district_code`, `location`, `branches` on the detail response) is
   `planned` with no plan file, and 1.2 is on an unmerged branch. Today's
   detail response has only identity, `coverage`, `source_url` and
   `last_seen_at`. TASK-004 is a hard gate on 1.3 being merged.
2. **`GET /api/institutions` already gives the manifest.** Unpaginated,
   deterministic order, exactly `{id, external_id, name, kind, source_url,
   last_seen_at}`. `(external_id, kind)` is the unique key — `external_id`
   alone is not, so the slug must carry the kind.
3. **Coverage is already grouped and naturally sorted server-side**
   (`routes/institutions.py:194-231`: street, then `number_int`, suffix,
   entrance). The page preserves that order rather than re-sorting.
4. **The ДГ/ДЯ number lives in the name, not in `DZ_NUMBER`** — it equals the
   `№` in the name for 0/53 kindergarten rows. Real names vary
   (`ДГ №13 „Мир“`, `ДЯ № 4 „…“`, `ДГ Мир №13`, `ЯСЛА №3`), so the parser
   looks for `№` followed by digits anywhere in the string.
5. **The search state already survives navigation.** `SearchExperience.tsx`
   persists `{query, matchState}` under `yasli:search-state:v2`; `matchState`
   carries `selectedAddress.label`, and each result carries
   `institution_kind`, `external_id` and `match_basis`. Everything the context
   line needs is there — nothing new has to be written.
6. **Copy to reuse verbatim exists** for the stale banner, the nursery
   admission note and the preschool §5 empty state. Freshness copy must be
   Bulgarian (the footer's `Last updated:` is a known defect, not a pattern).
7. **Dark mode is live.** `BaseLayout.astro` defines every token with
   `light-dark()`; `DESIGN-SYSTEM.md`'s "light only" section is stale. The
   page uses tokens only and is screenshotted in both themes.
8. **Tests are SSR-markup tests.** Vitest runs in the `node` environment with
   `renderToStaticMarkup`; no DOM, no fetch in tests. Effects never run, so
   component tests assert the server-rendered state per props.

## Decisions

The four choices where real alternatives were weighed are in
[DECISIONS.md](./DECISIONS.md): gating on backend 1.3 instead of hand-writing
types; reading the existing stored search state instead of a click marker;
static header from the manifest plus an island instead of a fully prerendered
or fully client-rendered page; and (added in validation) guarding result-card
links by manifest membership instead of accepting links to a static 404. The
rest:

- **Slug is `<kind>-<external_id>` and URLs carry a trailing slash**
  (`/institution/kindergarten-46/`) — Astro's default `directory` build
  format, and the shape the epic and YAS-11 name.
- **Manifest lives at `src/data/institutions-manifest.json`** and is sorted by
  our own key (kind order from `receptionKindOrder`, then numeric
  `external_id`) so the diff is stable even if the API's ordering changes.
- **The manifest is generated against the production backend**
  (`YASLI_INSTITUTIONS_URL`, default `http://localhost:8000/api/institutions`)
  so the committed list matches what the deployed page will fetch. The task
  records the URL and row count in the commit message.
- **The name is never rewritten.** `<h1>` shows `name` as delivered; the
  eyebrow shows the kind label plus `№N` when `parseInstitutionNumber` finds
  one. A parser that restructures names would break on the first unseen format.
- **Catchment renders in API order.** The backend's ordering is contractual
  and tested there; re-sorting here would duplicate the rule and drift.
- **Nursery pages never render a coverage list**, even if the API returns
  rows; kindergarten pages never render a district. Both follow the per-kind
  honesty rules in research §2.
- **The footer freshness slot stays hidden on this page.** It is a dataset-
  level date owned by the search island; the page shows its own
  per-institution `Последна актуализация:` line instead.
- **`.stale-banner` CSS moves from `index.astro` to `BaseLayout.astro`** so
  both pages share one rule; every other new style is page-owned in
  `[slug].astro` under a `profile-` prefix and reuses tokens only.
- **State is decided in effects, never during render.** The island renders
  the loading state on the server and on the first client render; the fetch
  and the `sessionStorage` read both happen in `useEffect`, so SSR markup and
  hydration always agree.
- **`.mjs` scripts are not unit-tested** (nothing under `scripts/` is today);
  the manifest script is verified by running it twice and checking for an
  empty diff, and by the build emitting one page per row.
- **`MatchState` stays exported from `SearchExperience.tsx`**;
  `storedSearch.ts` imports it type-only, which is erased at runtime and
  creates no cycle. Moving the type would touch three files for no behaviour.

## Risks

- **Backend 1.3 ships a different contract** than the field list in
  RESEARCH.md (names, nullability, branch shape). Mitigation: TASK-004
  regenerates the types and diffs them against that list; on any mismatch it
  stops, amends RESEARCH.md, the fixture profiles and TASK-005/006 before
  continuing — never adapts silently.
- **Backend 1.3 timing.** Tasks 4–9 cannot start until it is merged and
  deployed to the backend `npm run api:types` reads from. Mitigation: tasks
  1–3 need only today's API and land first; nothing user-facing ships until
  TASK-007/008, so a paused branch has no deploy impact.
- **Manifest drift.** An institution renamed or removed from the source after
  the manifest was generated shows a stale name or the not-found state; an
  institution *added* after it has no page at all. Mitigation: the not-found
  state is a designed state with a way back; result cards link only to slugs
  in the manifest (TASK-008), so an addition surfaces as a card without
  "Детайли" instead of a link to a 404; `npm run institutions:manifest` plus
  a redeploy is documented as the re-sync step; TASK-009 compares the
  manifest count with the live API count.
- **The fixture server answers `GET /api/institutions` on the manifest
  script's default URL** (`scripts/fixture-server.mjs:190`, port 8000), so a
  bare `npm run institutions:manifest` while `npm run fixtures` is up would
  replace the 77-row production manifest with the fixture's handful of rows.
  Mitigation: the script prints the source URL and row count in its summary
  line; every documented invocation (README, TASK-001, TASK-009) passes
  `YASLI_INSTITUTIONS_URL` explicitly; TASK-009 stops the fixture server
  before the idempotency run and checks the row count against the committed
  file.
- **`astro dev` returns 404 for slugs outside the manifest**, so fixture
  profiles keyed to made-up ids would be unreachable. Mitigation: TASK-003
  keys every profile to a real slug from the committed manifest and
  rewrites the S1 result ids to real pairs.
- **The `sessionStorage` key is duplicated in `BaseLayout.astro`'s pre-paint
  script.** Mitigation: `storedSearch.ts` exports the key with a comment
  naming that script; a test pins the literal value.
- **Long catchments** (hundreds of addresses on one page). Mitigation:
  per-street rows with inline numbers, no truncation; TASK-009 screenshots
  the longest fixture at 390px to check wrapping.
- **One existing test assertion guards the old `/institutions/` route** and
  would silently keep passing. Mitigation: TASK-008 replaces it with positive
  assertions on the new href; every other assertion stays byte-identical.
- **Accessibility regressions on a new page nobody has audited.**
  Mitigation: explicit `:focus-visible` rules for every link and button on
  the page, `role="status"` / `role="alert"` on loading and error blocks,
  one `<h1>`, and a keyboard-only walk in TASK-009 in both themes.

## Acceptance Criteria

- [ ] `npm run build` succeeds with **no backend running** and
      `dist/institution/` contains exactly one directory per manifest row.
- [ ] Against the deployed backend with phase 1.3, a direct visit to
      `/institution/kindergarten-46/` renders ДГ№13 „Мир“ with its address,
      contacts, catchment grouped by street and its 4 branch addresses as text.
- [ ] A nursery page shows the район it serves and no catchment list; a
      preschool page with no published catchment shows the §5 copy verbatim; a
      kindergarten page with no catchment shows its own line — none of them a
      generic "no results".
- [ ] Arriving via a result card's "Детайли" link shows the searched address
      and whether the match was by address or by district; a direct visit
      with no matching stored search (a fresh session, or a tab whose last
      search did not include this institution) shows neither and no empty
      block. A direct visit in a tab whose last search *did* include this
      institution shows the context too — by design (DECISIONS.md, "Read the
      existing stored search state"): the institution does serve that address.
- [ ] A slug outside the manifest returns HTTP 404 under `astro preview` and
      renders the site's 404 page; an institution missing from the API
      (`by-source` 404) renders the in-page not-found state with a link back.
- [ ] A `by-source` server error renders the in-page error state whose retry
      re-issues the request; the loading state is visible before a response.
- [ ] The stale banner appears when `last_seen_at` is more than 14 days old
      and not otherwise; the freshness line reads
      `Последна актуализация: dd.mm.yyyy`.
- [ ] Every result card whose institution is in the manifest carries both
      "Детайли" and "Източник"; the "Детайли" href is
      `/institution/<institution_kind>-<external_id>/`, including for
      infant-group rows shown under nurseries; a result absent from the
      manifest carries "Източник" only (unit test plus the S1 `999999` card).
- [ ] Keyboard-only navigation reaches every link and button on the page with
      a visible focus indicator in both themes.
- [ ] Every string on the page is Bulgarian; every outbound link has
      `target="_blank" rel="noreferrer"`, the `↗` marker and an
      `http:`/`https:` href — a `website` value with any other scheme renders
      no link.
- [ ] `npm run institutions:manifest` is idempotent (a second run produces no
      diff) and `.github/workflows/ci.yml` does not run it.
- [ ] `npm run lint`, `npm run check` and `npm run test` pass; the only
      changed pre-existing assertion is the one named in TASK-008.
- [ ] The page is legible at 390px and 1440px in light and dark for one
      kindergarten with branches, one nursery and one preschool with no
      catchment (six screenshots).

## Tasks

Task state lives here. Tasks are appended by `scripts/add_task.py` and
`scripts/add_final_task.py`. Update the checkboxes as work progresses.

- [x] TASK-001: Generate and commit the institutions manifest
- [x] TASK-002: Add domain helpers: name number, district names, shared stored-search state
- [x] TASK-003: Extend the fixture server with detail-page scenarios (depends on TASK-001)
- [x] TASK-004: Gate on backend 1.3: regenerate the API types
- [x] TASK-005: Add the by-source client wrapper and not-found error code (depends on TASK-004)
- [ ] TASK-006: Build the InstitutionProfile island with every state and section (depends on TASK-002,TASK-005)
- [ ] TASK-007: Add the prerendered /institution/[slug] route (depends on TASK-001,TASK-003,TASK-006)
- [ ] TASK-008: Re-add the Детайли link on result cards (depends on TASK-007)
- [ ] TASK-009: Final Validation
