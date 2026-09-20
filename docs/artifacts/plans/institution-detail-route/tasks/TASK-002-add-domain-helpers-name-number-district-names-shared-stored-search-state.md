# TASK-002: Add domain helpers: name number, district names, shared stored-search state

Depends on: None
Suggested commit: `refactor(domain): share stored-search state and add profile helpers`

## Goal

Every piece of logic the detail page shares with the search screen lives in
`src/lib/` with tests, and `SearchExperience.tsx` uses the shared copies with
no behaviour change.

## Files

- `src/lib/domain/institutionName.ts` — new: `parseInstitutionNumber(name)`
  → the digits after `№` (whitespace allowed) anywhere in the string, else
  `null`. Never rewrites or splits the name.
- `src/lib/domain/districts.ts` — new: `DistrictCode`
  (`NonNullable<MatchAddressContext["district_code"]>`), `DISTRICT_NAMES`
  (`01` Одесос, `02` Приморски, `03` Младост, `04` Владислав Варненчик,
  `05` Аспарухово — `INSTITUTION_DETAIL_MAP_RESEARCH.md` §4.1),
  `labelForDistrict(code)`.
- `src/lib/domain/website.ts` — new: `normalizeWebsiteUrl(value)` → an
  absolute `http:`/`https:` URL string or `null`. Trims; empty → `null`; a
  value with a scheme is kept only when the scheme is `http` or `https`
  (case-insensitive) — any other scheme (`javascript:`, `data:`, `mailto:`,
  `ftp:`…) → `null`; a protocol-relative `//host` → `null`; a bare host or
  host/path gets `https://` prefixed; the result must parse with `new URL()`
  and have a non-empty hostname, else `null`. The island renders the website
  row only for a non-null result — scraped `website` is an arbitrary string
  and must never reach an `href` unchecked.
- `src/lib/domain/freshness.ts` — add `STALE_BANNER_TEXT` (the exact string
  from `SearchResults.tsx:74`, built from `STALE_BANNER_THRESHOLD_DAYS`) and
  `formatFreshnessDate(date)` (the `bg-BG` `dd.mm.yyyy` formatter moved out of
  `SearchExperience.tsx`).
- `src/lib/search/storedSearch.ts` — new: `SEARCH_STATE_STORAGE_KEY =
  "yasli:search-state:v2"`, `StoredSearchState`, `loadStoredSearchState()`,
  `saveStoredSearchState(state)` (moved verbatim from `SearchExperience.tsx`,
  same try/catch and `typeof window` guards), and
  `findStoredMatchContext(stored, kind, externalId)` →
  `{ addressLabel, matchBasis } | null`. Imports `MatchState` type-only from
  `SearchExperience.tsx`. A comment names `BaseLayout.astro`'s pre-paint
  script as the other reader of the key.
- `src/lib/search/storedSearch.test.ts`, `src/lib/domain/domain.test.ts` — tests.
- `src/components/SearchExperience.tsx` — import the moved helpers; delete the
  private `STORAGE_KEY`, `StoredSearchState`, `loadStoredState`,
  `saveStoredState`, `formatDate`. No other line changes.
- `src/components/SearchResults.tsx` — render `STALE_BANNER_TEXT` instead of
  the inline string.

## Acceptance

- [ ] `parseInstitutionNumber`: `ДГ №13 „Мир“` → `13`; `ДЯ № 4 „Пчелица“` → `4`;
      `ДГ Мир №13` → `13`; `ЯСЛА №3` → `3`; `ОУ „Захари Стоянов“ — ПГ` → `null`;
      `ДЯ Море` → `null`
- [ ] `labelForDistrict` covers all five codes; `DISTRICT_NAMES` has exactly
      five keys
- [ ] `normalizeWebsiteUrl`: `dg13.bg` → `https://dg13.bg`;
      `http://ou-zs.bg/za-nas` unchanged; `HTTPS://OU-ZS.BG` kept (scheme
      case-insensitive); `www.dg13.bg/` → `https://www.dg13.bg/`;
      `javascript:alert(1)`, `data:text/html,x`, `mailto:a@b.bg`,
      `//evil.example`, `not a url`, `""`, `"   "` and `null` → `null`
- [ ] `findStoredMatchContext` returns `{ addressLabel, matchBasis }` when the
      stored state is `success`, has a `selectedAddress`, and any group holds a
      result with matching `institution_kind` and `external_id`; returns `null`
      for a `null` store, a non-`success` status, a missing `selectedAddress`,
      or an institution not in the results; a kindergarten present twice
      (standard + infant-group row) resolves to the first row's basis
- [ ] A test pins `SEARCH_STATE_STORAGE_KEY` to the literal
      `"yasli:search-state:v2"`
- [ ] `STALE_BANNER_TEXT` equals
      `Данните са по-стари от 14 дни. Проверете и официалния източник преди кандидатстване.`
- [ ] Every pre-existing test passes unchanged; `npm run check` passes
- [ ] At runtime (fixture S1): search, reload, results restore exactly as
      before; the stale banner (S6) and footer date are unchanged

Evidence: `npm run test` output; `git diff --stat` showing
`SearchExperience.tsx` only shrinking; two screenshots (restored results after
reload; S6 banner) matching the pre-change rendering.

## Steps

### RED
- [ ] Add the six `parseInstitutionNumber` cases, the district map test, the
      `normalizeWebsiteUrl` matrix, the storage-key literal test and the
      `findStoredMatchContext` matrix

### GREEN
- [ ] Create `institutionName.ts`, `districts.ts`, `website.ts`,
      `storedSearch.ts`; extend `freshness.ts`
- [ ] Point `SearchExperience.tsx` and `SearchResults.tsx` at the shared
      helpers and delete the private copies

### REFACTOR
- [ ] Re-run the full suite and the runtime restore check

## Notes

Do not move `MatchState`. A type-only import is erased at runtime, so
`storedSearch.ts` → `SearchExperience.tsx` → `storedSearch.ts` is not a
runtime cycle, and moving the type would touch `SearchResults.tsx` and its
test for no behaviour.

The pre-paint script in `BaseLayout.astro` reads the same key and checks
`status !== "idle" && status !== "loading"`; it stays as is, and the new module
comment points at it so a future key bump changes both.
