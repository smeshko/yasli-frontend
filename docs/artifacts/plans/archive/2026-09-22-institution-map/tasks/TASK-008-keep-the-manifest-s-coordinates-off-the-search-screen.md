# TASK-008: Keep the manifest's coordinates off the search screen

Depends on: TASK-001
Suggested commit: `perf(search): ship only the slugs the search screen needs`

## Goal

`/` stops carrying every institution's coordinate. The search screen needs 95
slugs; it currently imports all 95 manifest rows to derive them, so TASK-001's
`location` field rode along into its chunk.

## Files

- `scripts/generate-institutions-manifest.mjs` — write a second artifact,
  `src/data/institution-slugs.json`, from the same payload in the same run.
- `src/data/institution-slugs.json` — new, generated, committed.
- `src/components/SearchExperience.tsx` — import the slug list instead of the
  manifest.
- `src/lib/institutions/manifest.ts` / `manifest.test.ts` — a
  `manifestToSlugs(entries)` helper so the two artifacts cannot disagree about
  how a slug is built.
- `README.md`, `docs/ARCHITECTURE.md` — the second artifact and the one command
  that writes both.

## Acceptance

- [ ] `institution-slugs.json` is a flat array of 95 slug strings, in the
      manifest's order, and is written by the same
      `npm run institutions:manifest` run — never by hand, never separately.
- [ ] Both artifacts derive their slugs from `buildInstitutionSlug`, so they
      cannot drift; a unit test pins that the committed slug list equals
      `manifestToSlugs(committed manifest)`.
- [ ] `SearchExperience.tsx` no longer imports `institutions-manifest.json`,
      and the built search chunk contains no `precision`, `lat` or `lon`.
- [ ] The measured `SearchExperience` chunk is **below** the staging baseline
      of 23 014 B, not merely back to it.
- [ ] Search behaviour is unchanged: a result whose slug is in the list links
      to its detail page, one that is not renders as it did before. Existing
      `SearchExperience` / `SearchResults` tests pass unchanged.
- [ ] A second generator run produces no diff in either artifact.
- [ ] `npm run lint`, `npm run check`, `npm run test` and `npm run build` pass.

Evidence: `ls -la dist/_astro/*.js` for the branch against the staging
baseline, showing the `SearchExperience` chunk below 23 014 B; a `grep` of that
chunk for `precision` returning nothing; the generator's two-run summary with
an empty `git diff` between them.

## Steps

### RED
- [ ] Add a `manifestToSlugs` test in `manifest.test.ts`, and a test asserting
      the committed `institution-slugs.json` matches
      `manifestToSlugs(institutions-manifest.json)` — failing until both the
      helper and the artifact exist.

### GREEN
- [ ] Add `manifestToSlugs`, have the generator write both files, regenerate
      against the locally seeded backend, and switch `SearchExperience.tsx`
      to the slug list.

### REFACTOR
- [ ] Document the second artifact where the manifest is already documented,
      so nobody regenerates one without the other.

## Notes

Added after TASK-007's first pass measured the delta. The plan's acceptance
criterion asks for a zero per-chunk delta on `/`; this is what makes that true,
and it more than pays for itself because the slug list is far smaller than the
rows it replaces.

Do **not** solve this by dropping `location` from the manifest — the detail
route's link-outs and main pin are built from it, and that is the whole point
of TASK-001.
