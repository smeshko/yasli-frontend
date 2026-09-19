# Research: Institution detail route and page content

Curated findings only — no raw conversation transcripts.

## Key Files & Directories

- `src/pages/index.astro` — the only route with an island today
  (`<SearchExperience client:load />`). Its `<style is:global>` owns
  `.stale-banner`, `.results-status`, `.card-actions a` and the
  `:focus-visible` rules for the search UI (lines 339–344). Nothing from it
  loads on other pages.
- `src/pages/404.astro`, `src/pages/pravila.astro` — the content-page pattern:
  `BaseLayout` + `section.section-stack` + `p.eyebrow` + `h1`. `pravila` shows
  the `article.info-page` variant for long copy.
- `src/layouts/BaseLayout.astro` — shell, tokens, global classes
  (`.section-stack`, `.eyebrow`, `h1`, `p`, `.actions`, `.button`,
  `.status-badge`), `showNav = false`, two pre-paint inline scripts. The second
  reads `sessionStorage["yasli:search-state:v2"]` and sets
  `data-restoring-results` when the stored status is neither `idle` nor
  `loading` — the key and the status check are duplicated there on purpose.
  Focus rings: `.brand`, `.site-footer a`, `.button` use
  `outline: 2px solid var(--color-ink); outline-offset: 3px`.
- `src/components/SearchExperience.tsx` — owns `MatchState`
  (`status`, `address`, `grouped`, `selectedAddress`, `message`), the private
  `loadStoredState` / `saveStoredState` / `STORAGE_KEY`, the private
  `formatDate` (bg-BG `dd.mm.yyyy`), and the footer freshness slot writer
  (`[data-footer-freshness]`, English `Last updated:`).
- `src/components/SearchResults.tsx` — result cards; `card-actions` holds only
  the `Източник ↗` link (`target="_blank" rel="noreferrer"`,
  `<span aria-hidden="true">↗</span>`). Per-kind copy constants:
  `NURSERY_ADMISSION_NOTE`, `MISSING_DISTRICT_NOTE`, `emptyGroupText()`. The
  stale banner string is inline JSX at line 74.
- `src/components/SearchResults.test.tsx` — SSR markup tests. Line 95:
  `expect(html).not.toMatch(/href="\/institutions\//)` guards the route deleted
  in s12 (plural path). Line 203 asserts `<h3>ДГ Тест</h3>` verbatim.
- `src/lib/api/client.ts` — `requestJson<T>` → `ApiResult<T>`; error codes
  `network_error | http_error | invalid_json | address_not_found`. The 404
  mapping is byte-exact on `{"error":"address_not_found"}`
  (`isAddressNotFoundResponse`).
- `src/lib/api/types.ts` — generated, committed, ESLint-ignored. Declares six
  paths; no `by-source`. `InstitutionDetail` = list fields +
  `coverage: CoverageGroup[]`. `MatchAddressContext.district_code` is
  `"01"|"02"|"03"|"04"|"05"|null`.
- `src/lib/domain/kinds.ts` — `receptionKindOrder`, `labelForReceptionKind`
  (`Ясла`, `Детска градина`, `Подготвителна група`).
- `src/lib/domain/freshness.ts` — `STALE_BANNER_THRESHOLD_DAYS = 14`,
  `isSnapshotStale(freshnessDate, comparisonDate)` (UTC start-of-day, strictly
  greater than 14 days).
- `src/lib/domain/address.ts` — `formatAddressNumber` → `012`, `014А`,
  `015 вх.А` (three-digit padding is the site-wide convention).
- `src/lib/search/addressSuggestions.ts` — exports `formatStreetLabel(street)`
  (`ул. Преслав`, `бул. Сливница`) and `formatLocality`; both accept the
  `StreetSummary` shape structurally.
- `src/lib/search/results.ts` — `groupMatchResults`, `shouldShowStaleBanner`,
  `newestFreshnessDate`.
- `scripts/generate-api-types.mjs` — the committed-generated-artifact pattern:
  env override (`YASLI_OPENAPI_URL`), localhost default, spawns a CLI, exits
  with its code. 18 lines.
- `scripts/fixture-server.mjs` — dev-only HTTP server on `:8000` answering the
  API contract from fixed data; scenario chosen at startup via
  `FIXTURE_SCENARIO`; `last_seen_at` is startup-relative; CORS `*`. Scenarios
  documented in `docs/artifacts/plans/archive/2026-08-02-dvorat-design/SCENARIOS.md`.
- `.github/workflows/ci.yml` — `npm ci`, lint, check, test, build. Explicitly
  skips `api:types`; the manifest script follows the same rule.
- `astro.config.mjs` — `output: "static"`, React integration, no `build.format`
  override (so `directory`: `/institution/x/index.html`).
- `vitest.config.ts` — `environment: "node"`, includes `src/**/*.test.{ts,tsx}`.

## Architecture Facts

- Astro 6.3.1 static output. Unknown paths in `astro preview` and on
  Cloudflare Pages are served `dist/404.html` (from `src/pages/404.astro`);
  `astro dev` renders the same page for unmatched routes. A dynamic route
  only exists for params returned by `getStaticPaths`.
- The backend is a separate FastAPI service; all data reaches the browser via
  `fetch` to `PUBLIC_YASLI_API_BASE_URL` (baked in at build time). CORS allows
  GET only.
- **Today's institution API** (`backend/src/yasli/routes/institutions.py`):
  - `GET /api/institutions` → bare array of `{id, external_id, name, kind,
    source_url, last_seen_at}`; no params, no pagination; ordered kind
    (`nursery`, `kindergarten`, `preschool`) → name → external_id → id. ETag +
    `Cache-Control: public, max-age=3600`.
  - `GET /api/institutions/{institution_id}` → those six fields +
    `coverage: [{street: {id, city, raw_name, street_part, type_marker},
    addresses: [{id, number_int, number_suffix, entrance}]}]`, ordered by
    street city/raw_name/id then `number_int`, suffix NULLS LAST, entrance
    NULLS LAST. 404 body `{"error": "institution_not_found"}`.
  - `(external_id, kind)` is the unique constraint; `external_id` alone repeats
    across kinds.
- **Backend phase 1.3 contract** — **confirmed against the shipped schema in
  TASK-004** (2026-09-19). Backend 1.3 is merged on the backend's `staging`
  (`507ebe1 feat(api): add GET /institutions/by-source/{kind}/{external_id}`,
  epic phase 1.3 `status: done`, YAS-8). The schema below was read from a local
  run of that branch; it matches what the plan assumed, plus the two additive
  fields marked **(not anticipated)**. The detail response gains, with `null`
  (never omitted) where absent:
  - `address: string | null`
  - `phone: string | null`, `email: string | null`, `director: string | null`,
    `website: string | null`
  - `district_code: "01"|"02"|"03"|"04"|"05" | null`
  - `location: {lat: number, lon: number, precision: "building" | "approximate"} | null`
    — schema name `Location`
  - `branches: [{label: string | null, address: string | null, location: Location | null}]`
    — schema name `Branch`; label or address may be empty/null (three real
    branches have a name and no address; one has no coordinate)
  - `has_infant_group: boolean` — **(not anticipated)**; additive and not
    rendered by this phase (the search screen already derives the яслена група
    suffix from `MatchResult`). Recorded so a later phase does not rediscover it.
  - and `GET /api/institutions/by-source/{kind}/{external_id}` returning the
    same payload; unknown pair → 404 with the id route's body shape; invalid
    `kind` → 422. Its acceptance names `by-source/kindergarten/46` → ДГ№13
    „Мир“ with 4 branches, and requires regenerating the frontend types.
  - `kind` enum: `"nursery" | "kindergarten" | "preschool"` (`models/types.py:21`).
  - The route also accepts an optional `If-None-Match` request header (ETag
    revalidation, like the list route). The client wrapper does not send it.
  - OpenAPI documents only `200` and `422` for both institution routes; the
    `404` is returned at runtime with the byte-exact body
    `{"error":"institution_not_found"}` (verified by `curl` in TASK-004), so
    the generated types carry no 404 response type. `readNotFoundCode` matches
    on the body, not on a generated type, so this costs nothing.
- **The list response also gained `has_infant_group` and `location`**
  (`InstitutionListItem`) — **(not anticipated)**; backend epic §1.3 made this
  conditional on frontend epic 01 needing it. It is additive and the manifest
  script keeps only `kind`, `external_id` and `name`, so
  `src/data/institutions-manifest.json` is unaffected.
- Backend epic 01 status: 1.1 done, 1.2 done (merged, PR #2), 1.3 done
  (merged, PR #3). **Not yet deployed**: Railway's `backend-api` service
  deploys from the backend's `main` branch, and 1.3 sits on `staging` only, so
  `https://yasli-backend-production.up.railway.app` still serves the
  pre-1.3 contract. See TASK-004's note and the `Risks` entry in `PLAN.md`.
- `match_basis` on `MatchResult` is exactly `"address" | "district"`;
  `"district"` is how every nursery matches.
- Contacts are already in the production database: scraper epic 01 (`done`)
  emits `phone`, `email` and `director` for all 77 institutions and `website`
  for the 12 preschools, and backend phase 1.1 (`done`) ingests them; phase
  1.3 is what exposes them. Any single field can still be `null` (a source
  row may omit it), so the page must render cleanly with every contact field
  null. (Corrected in validation, 2026-09-16 — an earlier draft said contacts
  were `NULL` pending the scraper; that was stale.)
- Real institution name formats seen in backend/scraper test data:
  `ДГ №13 „Мир“`, `ДЯ № 4 „Пчелица“`, `ДГ Мир №13`, `ДГ № 42`, `ЯСЛА №3`,
  `ОУ „Захари Стоянов“ — ПГ`, `ДЯ Море`. `DZ_NUMBER` equals the `№` in the
  name for 0/53 kindergarten rows (research §1).
- District codes (`INSTITUTION_DETAIL_MAP_RESEARCH.md` §4.1): `01` Одесос,
  `02` Приморски, `03` Младост, `04` Владислав Варненчик, `05` Аспарухово.
- Branches are kindergarten-only (8 kindergartens, 15–17 buildings); ДГ№13
  „Мир“ has four. Three branches have a name and no address.
- Copy to reuse verbatim:
  - stale banner: `Данните са по-стари от 14 дни. Проверете и официалния източник преди кандидатстване.`
  - nursery routing: `Яслите не са по адрес, имате право да кандидатствате във всяка, но получавате предимство в тези, които са във вашия район.`
  - preschool with no catchment (`PRESCHOOL_COVERAGE_RESEARCH.md` §5):
    `Няма публикувано райониране за това адресно местоположение. Подайте заявление в избрано от вас училище — Община Варна не задължава да се запишете в конкретно.`
  - freshness (prescribed by `content-copy-audit.md`): `Последна актуализация: dd.mm.yyyy`
- Design system (`docs/design/DESIGN-SYSTEM.md`): Sofia Sans UI, Cormorant
  display for `h1`/group headings, function-named tokens only
  (`--color-bg-surface`, `--color-ink`, `--color-text-muted`,
  `--color-section-{nursery,kindergarten,preschool}`, `--radius-surface`,
  `--shadow-hard`, `--color-border-card`), hard offset shadow, 2px ink outline
  on surfaces, WCAG AA floor. Dark mode exists via `light-dark()` despite the
  doc's stale "light only" section.
- Accessibility baseline (`docs/design/accessibility-audit.md`): visible focus
  indicators are the disqualifying defect class; status blocks want
  `role="status"`, errors `role="alert"`; external links marked with the
  `↗` span pattern; no English microcopy in a `lang="bg"` document.

## Constraints

- No backend at build time: `npm run build` reads only committed files.
- `src/lib/api/types.ts` is never hand-edited; it is regenerated with
  `npm run api:types` and committed.
- Bulgarian-only UI (PRD FR-18); outbound links open in a new tab and are
  visibly marked external (FR-17); stale banner on profiles (FR-15); catchment
  grouped by street and naturally sorted (FR-12).
- Tests run in Node with `renderToStaticMarkup` — no DOM, no fetch, effects do
  not run.
- `showNav` stays `false`; the nav markup is not changed.
- One commit per task; `git add <paths>` only.

## Useful Commands

```bash
npm run dev                                   # :4321
FIXTURE_SCENARIO=S1 npm run fixtures          # :8000, deterministic API
YASLI_INSTITUTIONS_URL=https://<prod>/api/institutions npm run institutions:manifest
# never bare while `npm run fixtures` is up: the default URL is the fixture
# server's port, and it answers /api/institutions with a handful of rows
YASLI_OPENAPI_URL=https://<prod>/openapi.json npm run api:types
npm run lint && npm run check && npm run test && npm run build
ls dist/institution | wc -l                   # must equal manifest row count
npm run preview                               # serves dist/, 404 for unknown slugs
```

## Uncertainty

- ~~Exact TypeScript names the regenerated `types.ts` will use~~ — **resolved
  in TASK-004** (2026-09-19). TASK-005 uses these names:
  - operation:
    `operations["get_institution_by_source_api_institutions_by_source__kind___external_id__get"]`
  - response schema: `components["schemas"]["InstitutionDetail"]` — the **same**
    schema as `GET /api/institutions/{institution_id}`, as the plan predicted,
    so the new fields land on both routes
  - new schemas: `components["schemas"]["Branch"]` and
    `components["schemas"]["Location"]`
- ~~Whether an absent branch label/address is `null` or `""`~~ — the schema
  types both as `string | null`. The island still treats `""` as absent
  (`trim()` falsy), because the CSV rows behind the data carry `""`.
- Whether nursery `coverage` comes back empty or populated after 1.3 — still
  unknown, because the local database TASK-004 read the schema from has no
  rows. The page never renders it for nurseries either way, so nothing
  depends on the answer.
- **Not yet proven against real data**: that `by-source/kindergarten/46`
  returns four branches and non-null `phone`/`email`/`director`. TASK-004
  confirmed the *schema* only; the data path needs the deployed backend
  (see that task's note and TASK-009's real-backend row).
- The real `external_id` of a nursery and of a preschool with empty coverage
  for the fixture keys — resolved by reading the committed manifest in
  TASK-003.

## References

- `docs/artifacts/epics/01-institution-detail-page.md` — phase 1.1 (this plan)
- `../backend/docs/artifacts/epics/01-institution-data-foundation.md` — phase 1.3 contract
- `openspec/docs/INSTITUTION_DETAIL_MAP_RESEARCH.md` — §1 (`DZ_NUMBER`), §1.3
  (branches), §2 (content inventory and per-kind honesty), §4.1 (district codes),
  §5.1 (ruled out)
- `openspec/docs/PRESCHOOL_COVERAGE_RESEARCH.md` §5 — empty-catchment copy
- `openspec/docs/NURSERY_RESEARCH.md` §3 — why nurseries show a district
- `openspec/docs/PRD.md` — FR-8, FR-11, FR-12, FR-15, FR-17, FR-18, §7.3
- `docs/design/DESIGN-SYSTEM.md`, `docs/design/accessibility-audit.md` (parent repo),
  `docs/design/content-copy-audit.md` (parent repo)
- `openspec/changes/archive/2026-05-12-s12-freeze-remove-institution-pages/proposal.md`
  — what was removed and why
- `docs/artifacts/plans/archive/2026-08-02-dvorat-design/SCENARIOS.md` — fixture conventions
