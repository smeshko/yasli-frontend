# TASK-001: Carry the institution coordinate in the manifest

Depends on: None
Suggested commit: `feat(institutions): carry the coordinate in the manifest`

## Goal

`src/data/institutions-manifest.json` carries each institution's `location`,
so the detail route can render its link-outs and its main pin without waiting
for — or depending on — a runtime fetch.

## Files

- `scripts/generate-institutions-manifest.mjs` — keep `location` on each row,
  validate its shape, and refuse to write a manifest in which no row has one.
- `src/lib/institutions/manifest.ts` — widen `ManifestEntry` with
  `location: ManifestLocation | null`, re-exporting the shape from
  `InstitutionLocation` in the API client rather than redeclaring it.
- `src/lib/institutions/manifest.test.ts` — cover the widened type through the
  existing helpers.
- `src/data/institutions-manifest.json` — regenerated, committed.
- `README.md` — note that regeneration needs a backend carrying backend phase
  1.2's coordinates, alongside the existing fixture-server warning.
- `docs/ARCHITECTURE.md` — add `location` to the manifest field list.

## Acceptance

- [ ] The generator keeps `location` when present and writes `null` when the
      row has none, validating `lat`/`lon` as finite numbers and `precision`
      against the two enum values — a malformed location exits non-zero with a
      row-numbered message, matching the existing validation style.
- [ ] A payload in which **no** row carries a location exits non-zero without
      writing the file, so a run against the deployed (pre-1.2) backend cannot
      silently strip the field from all 95 rows.
- [ ] The regenerated manifest has 95 rows: 77 with a `building`-precision
      location, and `null` for exactly the 18 infant-group nursery rows.
- [ ] A second run against the same backend produces no diff.
- [ ] `manifestToStaticPaths`, `buildSlugSet` and `institutionPath` behave
      identically on widened entries; existing tests keep passing unchanged.
- [ ] `npm run lint`, `npm run check`, `npm run test` and `npm run build` pass.

Evidence: the generator's summary line for both runs (source URL and row
count), `git diff --stat` empty on the second, and a `python3 -c` count of
located vs null rows in the committed file pasted into the commit message.

## Steps

### RED
- [ ] Extend `manifest.test.ts` so an entry carrying a `location` flows
      through `manifestToStaticPaths` into `props` and through `buildSlugSet`
      unchanged — failing until `ManifestEntry` is widened.

### GREEN
- [ ] Widen `ManifestEntry`; add `location` to `REQUIRED_FIELDS` handling in
      the generator as an *optional-but-validated* field, plus the
      no-row-has-one guard.
- [ ] Start the locally seeded backend (backend `staging` + its
      production-like seed) and run
      `YASLI_INSTITUTIONS_URL=http://localhost:8000/api/institutions npm run institutions:manifest`.
- [ ] Run it a second time and confirm an empty diff.

### REFACTOR
- [ ] Update `README.md` and `docs/ARCHITECTURE.md` in the same commit, so the
      field and the regeneration precondition are documented where the
      existing manifest notes live.

## Notes

The deployed backend serves **no** `location` on `/api/institutions`
(measured 2026-09-21: 95 rows, keys `id, external_id, name, kind, source_url,
last_seen_at`). The documented production regeneration URL in the README would
therefore wipe the field — which is exactly what the no-row-has-one guard
exists to prevent. Do not relax that guard to make a production run succeed;
the right response is to wait for backend `main`.

The 18 null rows are not a defect to fix here — see `DECISIONS.md` 5.
