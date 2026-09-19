# Fixture scenarios — institution detail page

Deterministic institution profiles served by `scripts/fixture-server.mjs` for
runtime verification of `/institution/<kind>-<external_id>/`. They extend the
search scenarios in
[the archived SCENARIOS.md](../archive/2026-08-02-dvorat-design/SCENARIOS.md)
(S1–S9), which still behave as that table says.

Scenario selection is read **at startup**, so D2 and D3 each need their own
restart:

```bash
FIXTURE_SCENARIO=S1 npm run fixtures   # D1: fresh profiles (any scenario other than D2/D3)
FIXTURE_SCENARIO=D2 npm run fixtures   # profiles 30 days old
FIXTURE_SCENARIO=D3 npm run fixtures   # by-source answers 500
```

Run `npm run dev` alongside it. The dev server is on `:4321`, the fixture
server on `:8000`. `astro dev` only serves the slugs `getStaticPaths` reads
from `src/data/institutions-manifest.json`, which is why every profile key is
a real `(kind, external_id)` pair from that file.

## Scenarios

| id | Launch | `by-source` behaviour | Proves |
|---|---|---|---|
| D1 | any scenario except D2/D3 (use `S1`, so the search side is populated too) | 200 for the four profiled slugs, `last_seen_at` = now − 2d; byte-exact 404 `{"error":"institution_not_found"}` for every other pair; 422 for a kind outside the enum | every content section and per-kind empty state, the in-page not-found state, the fresh freshness line |
| D2 | `D2` | as D1, but every profile's `last_seen_at` = now − 30d | stale banner on the page (threshold 14d) |
| D3 | `D3` | 500 `{"error":"internal_error"}` for every pair | error state with a working retry; loading state on retry |

## Slugs

| Page | Profile | Proves |
|---|---|---|
| `/institution/kindergarten-46/` — ДГ№13 "Мир" | address, all four contacts (`website` is the bare host `dg13mir.bg`), catchment on three streets in server order with `014`, `014А`, `015 вх.А`, `district_code: "01"`, four branches (three with an address, `Филиал „Морско конче“` label-only), a location | the full kindergarten page; no district is printed |
| `/institution/nursery-4/` — ДЯ № 4 "Приказен свят" | address and phone only, `coverage: []`, `district_code: "02"`, no branches | nursery shows район Приморски and the admission note, never a catchment list |
| `/institution/preschool-12/` — ОУ "Панайот Волов" | address and website only, `coverage: []`, `district_code: null`, no branches | the §5 empty-catchment copy verbatim |
| `/institution/kindergarten-34/` — ДГ№1 "Светулка" | every contact `null`, no address, `coverage: []`, no branches | the "nothing published" edge: `Няма публикувани контакти.`, the kindergarten empty-catchment line, no district |
| `/institution/kindergarten-35/` — ДГ№2 "Щастливо детство" | **absent** from `PROFILES` | a real manifest slug (the page exists) whose `by-source` is 404 → the in-page not-found state with `Към търсенето` |
| `/institution/kindergarten-999999/` | absent, and not in the manifest | no page at all: HTTP 404 under `npm run preview`, the site 404 page |

The profile content is synthetic (Мир-shaped for `kindergarten/46`), not real
data; the real-backend check is the plan's final validation.

## S1 result rows

S1 (`прес` → ул. Преслав 012) now returns real manifest pairs so "Детайли"
lands on a page that exists:

| Card | Pair | Basis | Where "Детайли" goes |
|---|---|---|---|
| ДЯ № 4 "Приказен свят" | `nursery/4` | district | the nursery page, with the district-basis context line |
| ДЯ № 9 "ДЕТЕЛИНА" | `nursery/9` | district | a page with no profile → in-page not-found |
| ДЯ № 13 "РУСАЛКА" | `nursery/11` | district | a page with no profile → in-page not-found |
| ДГ№13 "Мир" | `kindergarten/46` | address | the full kindergarten page, with the address-basis context line |
| ДГ „Нова градина“ | `kindergarten/999999` | address | **no link** — the pair is not in the manifest, so the card renders `Източник` only |
| ДГ№5 "Слънчо" (яслена група) | `kindergarten/38` | address | a page with no profile → in-page not-found (the href uses `institution_kind`, so it is the kindergarten's page) |
| ОУ "Панайот Волов" | `preschool/12` | address | the preschool page |

S2–S5 keep their synthetic ids (`104`, `204`, …), so after the manifest guard
lands their cards show `Източник` only. That is the guard working, not a
regression.

## Criterion coverage

| PLAN acceptance criterion | Scenario / slug |
|---|---|
| ДГ№13 "Мир" with address, contacts, catchment by street, four branch lines | D1 `kindergarten-46` (synthetic); the real backend for the criterion itself |
| Nursery shows its район and no catchment list | D1 `nursery-4` |
| Preschool with no catchment shows the §5 copy verbatim | D1 `preschool-12` |
| Kindergarten with no catchment shows its own line | D1 `kindergarten-34` |
| "Serves your address" context by address / by district | S1 → "Детайли" on ДГ№13 (address) and on ДЯ № 4 (district) |
| No context on a direct visit without a matching stored search | a fresh session, or S1 then `kindergarten-34` (not in the S1 results) |
| Unknown slug → HTTP 404 and the site 404 page | `npm run preview`, `kindergarten-999999` |
| Missing profile → in-page not-found with a link back | D1 `kindergarten-35` |
| Error state with a working retry; loading visible | D3 (retry re-issues the request); throttle for the first load |
| Stale banner at >14 days only; freshness line | D2 (banner) vs D1 (none) |
| Result cards: "Детайли" only for manifest pairs | S1: ДГ№13 and ДЯ № 4 carry it, ДГ „Нова градина“ does not |
| Website `href` is `http(s):` only | D1 `kindergarten-46` (`dg13mir.bg` → `https://dg13mir.bg`), `preschool-12` (kept as is) |

## Notes that cost us a round of review

- **Every profile key is a real manifest slug.** `astro dev` renders a 404 for
  any slug `getStaticPaths` did not return, so a profile keyed to a made-up id
  can never be reached in the browser. That includes the deliberately absent
  one: `kindergarten/35` is real, has a page, and has no profile.
- **`last_seen_at` is computed per request from server startup**, never
  hardcoded, for the same reason as the search scenarios: the 14-day threshold
  compares against `new Date()`.
- **The 404 body is byte-exact.** The client maps to `institution_not_found`
  only when the status is 404 *and* the body is exactly
  `{"error":"institution_not_found"}`; anything else is a generic `http_error`
  and the error state renders instead of not-found.
- **`has_infant_group` is in every profile but on no page.** Backend 1.3 ships
  it on `InstitutionDetail` (TASK-004 found it; the plan had not anticipated
  it). The profiles carry it so a fixture response matches the real schema
  field for field, and `kindergarten/46` sets it `true` because its S1 card is
  the infant-group row. The detail page renders nothing from it.
- **The manifest script's default URL is this server.** A bare
  `npm run institutions:manifest` while fixtures are up would replace the
  95-row production manifest with the fixture's three `/api/institutions`
  rows. Always pass `YASLI_INSTITUTIONS_URL` explicitly.
