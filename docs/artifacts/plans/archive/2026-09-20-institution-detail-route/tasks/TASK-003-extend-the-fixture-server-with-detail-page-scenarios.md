# TASK-003: Extend the fixture server with detail-page scenarios

Depends on: TASK-001
Suggested commit: `chore(fixtures): serve institution profiles for the detail page`

## Goal

Every detail-page state — kindergarten with branches, nursery, preschool with
no catchment, kindergarten with nothing, not-found, server error, stale — can
be reached in `astro dev` with no backend, using slugs that exist in the
committed manifest.

## Files

- `scripts/fixture-server.mjs` — add a `PROFILES` map keyed `<kind>/<external_id>`
  and the route `GET /api/institutions/by-source/:kind/:external_id`; extend
  the `institution()` helper to take an explicit `external_id`; rewrite the
  S1 result set so its rows use real `(kind, external_id)` pairs from the
  manifest (all but one — see Acceptance); add scenarios `D2` and `D3`;
  update the header comment to point at
  both `SCENARIOS.md` files.
- `docs/artifacts/plans/institution-detail-route/SCENARIOS.md` — new,
  same shape as the archived one: launch table, slug table, criterion coverage,
  and the "notes that cost us a round" section.

## Acceptance

- [ ] Profiles follow the backend 1.3 contract in `RESEARCH.md` exactly
      (every new field present, `null` where absent), keyed to real slugs:
      - `kindergarten/46` — full: address, all four contacts, coverage on at
        least three streets whose numbers include a suffix and an entrance
        (`014`, `014А`, `015 вх.А`) in server order, `district_code: "01"`,
        four branches (three with an address, one label-only), a `location`
      - one real nursery — address, phone only, `coverage: []`,
        `district_code: "02"`, `branches: []`
      - one real preschool — address, website only, `coverage: []`,
        `district_code: null`, `branches: []`
      - one real second kindergarten — every contact `null`, `coverage: []`,
        `branches: []` (the "nothing published" edge)
      - one real slug deliberately **absent** from `PROFILES` — the in-page
        not-found case
- [ ] Any key not in `PROFILES` → `404` with body byte-exact
      `{"error":"institution_not_found"}`
- [ ] `FIXTURE_SCENARIO=D2` → every profile's `last_seen_at` is startup − 30d;
      `D3` → the route answers `500 {"error":"internal_error"}`; every other
      scenario id serves fresh profiles
- [ ] S1's result rows for the address `ул. Преслав 012` include
      `kindergarten/46` (address basis) and the fixture nursery (district
      basis), so "Детайли" on those cards lands on a page with a profile
- [ ] One other S1 result row keeps a made-up pair (`kindergarten/999999`,
      not in the manifest) so the search screen shows a card with no
      "Детайли" link at runtime (the TASK-008 guard); it is not one of the
      rows above and its count-level behaviour in S1 is unchanged
- [ ] S1–S9 still behave as the archived `SCENARIOS.md` table says (spot-check
      S3 district fallback and S8 byte-exact 404)
- [ ] `SCENARIOS.md` lists D1 (default), D2, D3, names every slug and what it
      proves, and maps each PLAN acceptance criterion to a scenario

Evidence: `curl -s localhost:8000/api/institutions/by-source/kindergarten/46 | jq '.branches | length'`
→ `4`; `curl -s -w '%{http_code}' …/kindergarten/999999` → the exact 404
body and code; the same for `D2` (`last_seen_at` 30 days old) and `D3` (500).

## Steps

### RED
- [ ] Start the current fixture server and record that the `by-source` route
      returns the generic `{"error":"not_found"}` 404 — the before-state

### GREEN
- [ ] Pick the four real slugs plus the absent one from
      `src/data/institutions-manifest.json`; write `PROFILES`
- [ ] Add the route, the two scenarios and the S1 rewrite
- [ ] Write `SCENARIOS.md`

### REFACTOR
- [ ] Re-run S3 and S8 to confirm the search scenarios are untouched

## Notes

`astro dev` only serves slugs returned by `getStaticPaths`, which reads the
committed manifest — a profile keyed to a made-up id is unreachable in the
browser. That is why every key here is a real slug, including the one that is
deliberately missing.

Keep `last_seen_at` startup-relative (`lastSeenAt(daysAgo)`), never a literal
date, for the reason the archived notes give: the 14-day threshold compares
against `new Date()`.

The profile content for `kindergarten/46` is synthetic (Мир-shaped), not real
data; the real-backend check lives in TASK-009.
